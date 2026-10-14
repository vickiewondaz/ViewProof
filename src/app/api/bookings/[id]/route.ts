import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope, findRosterAgent } from "@/lib/session";
import { generateOtp, OTP_RESEND_COOLDOWN_MS } from "@/lib/otp";
import { sendWhatsApp, fmtDateTime } from "@/lib/whatsapp";

const Patch = z.object({
  action: z.enum(["confirm", "cancel-buyer", "cancel-agency", "resend", "close", "payout"]),
  closedPrice: z.coerce.number().positive().optional(),
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
      listingId: b.listingId,
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
    // Buyer hears "confirmed" (was wrongly re-sent as a generic alert before).
    void (async () => {
      const full = await prisma.booking.findUnique({
        where: { id: b.id },
        include: {
          listing: { include: { agency: true } },
          slot: true,
          agent: { select: { publicName: true, fullName: true } },
        },
      });
      if (!full) return;
      const host = full.agent?.publicName ?? full.agent?.fullName?.split(" ")[0] ?? "your host";
      try {
        await sendWhatsApp({
          to: full.buyerPhone,
          template: "booking_confirm",
          params: [full.buyerName, full.listing.title, fmtDateTime(full.slot.startsAt), "confirmed", host, full.listing.agency.name, "— see your earlier message"],
        });
        await prisma.waMessage.create({ data: { bookingId: b.id, template: "booking_confirm", status: "sent" } });
      } catch {
        await prisma.waMessage.create({ data: { bookingId: b.id, template: "booking_confirm", status: "failed" } });
      }
    })();
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

  if (action === "close") {
    // Owner or the assigned host records the closed deal. Terms were agreed
    // upfront on the listing; this stamps price + date + payout-pending.
    if (u.role === "agent") {
      const row = u.phoneNumber ? await findRosterAgent(agencyScope(u), u.phoneNumber) : null;
      if (!row || b.agentId !== row.id)
        return NextResponse.json({ ok: false, error: "Not your booking — ask your owner to add your number to the roster." }, { status: 403 });
    }
    if (b.status !== "Completed")
      return NextResponse.json({ ok: false, error: "Only attended viewings can close." }, { status: 409 });
    const price = parsed.data.closedPrice;
    if (!price) return NextResponse.json({ ok: false, error: "Add the closed price." }, { status: 400 });
    const updated = await prisma.booking.update({
      where: { id: b.id },
      data: { closedPrice: price, closedAt: new Date(), payoutStatus: "Pending" },
    });
    await audit({ actor: u.id, entity: "booking", entityId: b.id, action: "close", diff: { closedPrice: price } });
    void (async () => {
      const full = await prisma.booking.findUnique({
        where: { id: b.id },
        include: {
          listing: { select: { title: true, currency: true } },
          agent: { select: { publicName: true, fullName: true, phone: true } },
        },
      });
      if (!full) return;
      const host = full.agent?.publicName ?? full.agent?.fullName?.split(" ")[0] ?? "your host";
      try {
        await sendWhatsApp({
          to: full.buyerPhone,
          template: "deal_closed",
          params: [full.buyerName, full.listing.title, `${full.listing.currency} ${Number(price).toLocaleString()}`, host],
        });
        await prisma.waMessage.create({ data: { bookingId: b.id, template: "deal_closed", status: "sent" } });
      } catch {
        await prisma.waMessage.create({ data: { bookingId: b.id, template: "deal_closed", status: "failed" } });
      }
      // Hosting agent hears it by SMS: deal closed, cut pending owner payout.
      if (full.agent?.phone) {
        const { sendSms } = await import("@/lib/sms");
        await sendSms(
          full.agent.phone,
          `ViewProof: deal closed for ${full.listing.title} at ${full.listing.currency} ${Number(price).toLocaleString()}. Your cut is pending — terms you agreed apply.`
        );
      }
    })();
    return NextResponse.json({ ok: true, booking: { id: updated.id, closedPrice: updated.closedPrice } });
  }

  if (action === "payout") {
    // Owner only: money visibly marked paid. ViewProof never moves cash.
    if (u.role !== "owner" && u.role !== "admin")
      return NextResponse.json({ ok: false }, { status: 403 });
    if (!b.closedAt)
      return NextResponse.json({ ok: false, error: "Close the deal first." }, { status: 409 });
    const updated = await prisma.booking.update({
      where: { id: b.id },
      data: { payoutStatus: "Paid", paidAt: new Date() },
    });
    await audit({ actor: u.id, entity: "booking", entityId: b.id, action: "payout", diff: {} });
    // Agent hears it by SMS: their cut moved. WhatsApp receipt follows when live.
    void (async () => {
      const full = await prisma.booking.findUnique({
        where: { id: b.id },
        include: {
          listing: { select: { title: true, currency: true } },
          agent: { select: { phone: true, publicName: true } },
        },
      });
      if (full?.agent?.phone && full.closedPrice) {
        const { sendSms } = await import("@/lib/sms");
        await sendSms(
          full.agent.phone,
          `ViewProof: your cut for ${full.listing.title} (closed at ${full.listing.currency} ${Number(full.closedPrice).toLocaleString()}) is marked PAID. Confirm with your owner when received.`
        );
      }
    })();
    return NextResponse.json({ ok: true, booking: { id: updated.id, payoutStatus: updated.payoutStatus } });
  }

  // resend — 60s cooldown, rotates OTP, resets attempts, delivers new code.
  const lastMsg = await prisma.waMessage.findFirst({
    where: { bookingId: b.id, template: "booking_confirm" },
    orderBy: { at: "desc" },
  });
  if (lastMsg && Date.now() - lastMsg.at.getTime() < OTP_RESEND_COOLDOWN_MS)
    return NextResponse.json({ ok: false, error: "Wait 60s before resend" }, { status: 429 });
  const { code: freshCode, hash, expires } = generateOtp();
  const updated = await prisma.booking.update({
    where: { id: b.id },
    data: { otpHash: hash, otpExpires: expires, otpAttempts: 0 },
  });
  void (async () => {
    const full = await prisma.booking.findUnique({
      where: { id: b.id },
      include: {
        listing: { include: { agency: true } },
        slot: true,
        agent: { select: { publicName: true, fullName: true } },
      },
    });
    if (!full) return;
    const host = full.agent?.publicName ?? full.agent?.fullName?.split(" ")[0] ?? "your host";
    try {
      await sendWhatsApp({
        to: full.buyerPhone,
        template: "booking_confirm",
        params: [full.buyerName, full.listing.title, fmtDateTime(full.slot.startsAt), full.status, host, full.listing.agency.name, freshCode],
      });
      await prisma.waMessage.create({ data: { bookingId: b.id, template: "booking_confirm", status: "resent" } });
    } catch {
      await prisma.waMessage.create({ data: { bookingId: b.id, template: "booking_confirm", status: "failed" } });
    }
  })();
  await audit({ actor: u.id, entity: "booking", entityId: b.id, action: "otp-resend", diff: {} });
  return NextResponse.json({ ok: true, booking: { id: updated.id, otpExpires: updated.otpExpires } });
}
