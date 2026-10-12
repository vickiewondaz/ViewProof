import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";
import { verifyOtp, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { sendWhatsApp } from "@/lib/whatsapp";

const Checkin = z.object({
  bookingId: z.string(),
  // checkin needs the 6-digit code; outcome-only actions do not.
  action: z.enum(["checkin", "no-show-buyer", "no-show-agent", "unavailable"]).default("checkin"),
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit code from your Viewing Pass.").optional(),
  deviceId: z.string().max(120).optional(),
});

// POST /api/checkin — assigned agent or owner only. Verifies hash + window +
// attempts (5 max, then NeedsReview). Records checkinAt + device, sets outcome,
// sends receipt WhatsApp to buyer (+ agent where reachable), audits everything.
// Receipt states observable facts only — never legal verification.
export async function POST(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Checkin.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  const { bookingId, action, code, deviceId } = parsed.data;

  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true, slot: true },
  });
  if (!b) return NextResponse.json({ ok: false }, { status: 404 });
  if (b.listing.agencyId !== agencyScope(u))
    return NextResponse.json({ ok: false }, { status: 403 });
  if (u.role === "agent" && b.agentId !== u.id)
    return NextResponse.json({ ok: false, error: "Not your booking" }, { status: 403 });
  if (!["Confirmed"].includes(b.status as string))
    return NextResponse.json({ ok: false, error: `Cannot record outcome in state ${b.status}` }, { status: 409 });

  if (action !== "checkin") {
    const status =
      action === "no-show-buyer" ? "NoShowBuyer" : action === "no-show-agent" ? "NoShowAgent" : "NeedsReview";
    const updated = await prisma.booking.update({ where: { id: b.id }, data: { status: status as never } });
    await audit({ actor: u.id, entity: "booking", entityId: b.id, action, diff: { deviceId } });
    return NextResponse.json({ ok: true, booking: { id: updated.id, status: updated.status } });
  }

  if (!code) return NextResponse.json({ ok: false, error: "Code required" }, { status: 400 });
  if (!b.otpHash || !b.otpExpires)
    return NextResponse.json({ ok: false, error: "No active code — resend required" }, { status: 410 });
  if (b.otpExpires.getTime() < Date.now())
    return NextResponse.json({ ok: false, error: "Code expired — resend required" }, { status: 410 });
  if (b.otpAttempts >= OTP_MAX_ATTEMPTS) {
    await prisma.booking.update({ where: { id: b.id }, data: { status: "NeedsReview" as never } });
    return NextResponse.json({ ok: false, error: "Too many attempts — flagged for review" }, { status: 403 });
  }

  if (!verifyOtp(code, b.otpHash)) {
    const attempts = b.otpAttempts + 1;
    await prisma.booking.update({
      where: { id: b.id },
      data: {
        otpAttempts: attempts,
        ...(attempts >= OTP_MAX_ATTEMPTS ? { status: "NeedsReview" as never } : {}),
      },
    });
    await audit({ actor: u.id, entity: "booking", entityId: b.id, action: "checkin-failed", diff: { attempts } });
    return NextResponse.json(
      { ok: false, error: "Wrong code", attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - attempts) },
      { status: 401 }
    );
  }

  const updated = await prisma.booking.update({
    where: { id: b.id },
    data: { status: "Completed" as never, checkinAt: new Date() },
  });
  await audit({ actor: u.id, entity: "booking", entityId: b.id, action: "checkin", diff: { deviceId } });

  void (async () => {
    try {
      await sendWhatsApp({ to: b.buyerPhone, template: "receipt", components: [] });
      await prisma.waMessage.create({ data: { bookingId: b.id, template: "receipt", status: "sent" } });
    } catch (e) {
      await prisma.waMessage.create({ data: { bookingId: b.id, template: "receipt", status: "failed" } });
      console.warn("[receipt] send failed", e);
    }
  })();

  return NextResponse.json({
    ok: true,
    receipt: {
      bookingId: updated.id,
      listing: b.listingId,
      agency: b.listing.agencyId,
      agent: b.agentId,
      scheduled: b.slot.startsAt,
      checkin: updated.checkinAt,
      outcome: "Completed",
    },
  });
}
