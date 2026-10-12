import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";
import { generateOtp, OTP_RESEND_COOLDOWN_MS } from "@/lib/otp";
import { sendWhatsApp } from "@/lib/whatsapp";

const Patch = z.object({
  action: z.enum(["confirm", "cancel-buyer", "cancel-agency", "resend"]),
});

// GET /api/bookings/[id] — public pass payload by unguessable id (no PII beyond
// holder's own link): code expiry only, never the code itself. Staff get full.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const b = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { title: true, area: true, agency: { select: { name: true, contactPublic: true } } } },
      slot: { select: { startsAt: true } },
      agent: { select: { publicName: true, fullName: true } },
    },
  });
  if (!b) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({
    ok: true,
    pass: {
      id: b.id,
      status: b.status,
      listing: b.listing.title,
      area: b.listing.area,
      agency: b.listing.agency.name,
      contact: b.listing.agency.contactPublic,
      host: b.agent?.publicName ?? b.agent?.fullName?.split(" ")[0] ?? null,
      startsAt: b.slot.startsAt,
      otpExpires: b.otpExpires,
    },
  });
}

// PATCH — confirm/cancel/resend. Confirm+cancel-agency+resend are staff-only
// (assigned agent or owner); cancel-buyer is public (holder of link).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const b = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { listing: true, slot: true },
  });
  if (!b) return NextResponse.json({ ok: false }, { status: 404 });

  const { action } = parsed.data;

  if (action === "cancel-buyer") {
    if (!["Requested", "Confirmed"].includes(b.status as string))
      return NextResponse.json({ ok: false, error: "Cannot cancel in this state" }, { status: 409 });
    const updated = await prisma.booking.update({
      where: { id: b.id },
      data: { status: "CancelledByBuyer" as never },
    });
    await prisma.slot.update({ where: { id: b.slotId }, data: { bookedCount: { decrement: 1 } } }).catch(() => null);
    await audit({ actor: `buyer:${b.buyerPhone}`, entity: "booking", entityId: b.id, action: "cancel-buyer", diff: {} });
    return NextResponse.json({ ok: true, booking: { id: updated.id, status: updated.status } });
  }

  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (b.listing.agencyId !== agencyScope(u))
    return NextResponse.json({ ok: false }, { status: 403 });

  if (action === "confirm") {
    if (b.status !== "Requested")
      return NextResponse.json({ ok: false, error: "Only Requested can confirm" }, { status: 409 });
    const updated = await prisma.booking.update({
      where: { id: b.id },
      data: { status: "Confirmed" as never },
    });
    await audit({ actor: u.id, entity: "booking", entityId: b.id, action: "confirm", diff: {} });
    // Agent alert (assigned) — fire-and-forget.
    void sendWhatsApp({ to: b.buyerPhone, template: "booking_confirm", components: [] }).catch(() => null);
    return NextResponse.json({ ok: true, booking: { id: updated.id, status: updated.status } });
  }

  if (action === "cancel-agency") {
    if (!["Requested", "Confirmed"].includes(b.status as string))
      return NextResponse.json({ ok: false, error: "Cannot cancel in this state" }, { status: 409 });
    const updated = await prisma.booking.update({
      where: { id: b.id },
      data: { status: "CancelledByAgency" as never },
    });
    await prisma.slot.update({ where: { id: b.slotId }, data: { bookedCount: { decrement: 1 } } }).catch(() => null);
    await audit({ actor: u.id, entity: "booking", entityId: b.id, action: "cancel-agency", diff: {} });
    return NextResponse.json({ ok: true, booking: { id: updated.id, status: updated.status } });
  }

  // resend — 60s cooldown, rotates OTP, resets attempts.
  const lastMsg = await prisma.waMessage.findFirst({
    where: { bookingId: b.id, template: "booking_confirm" },
    orderBy: { at: "desc" },
  });
  if (lastMsg && Date.now() - lastMsg.at.getTime() < OTP_RESEND_COOLDOWN_MS)
    return NextResponse.json({ ok: false, error: "Wait 60s before resend" }, { status: 429 });
  const { hash, expires } = generateOtp();
  const updated = await prisma.booking.update({
    where: { id: b.id },
    data: { otpHash: hash, otpExpires: expires, otpAttempts: 0 },
  });
  await prisma.waMessage.create({ data: { bookingId: b.id, template: "booking_confirm", status: "resent" } });
  await audit({ actor: u.id, entity: "booking", entityId: b.id, action: "otp-resend", diff: {} });
  return NextResponse.json({ ok: true, booking: { id: updated.id, otpExpires: updated.otpExpires } });
}
