import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { generateOtp } from "@/lib/otp";
import { sendWhatsApp } from "@/lib/whatsapp";
import { rateLimit, clientKey } from "@/lib/ratelimit";

const Prequal = z.object({
  budgetBand: z.string().max(60).optional(),
  moveDate: z.string().max(40).optional(),
  consent: z.literal(true, { message: "Privacy + viewing policy consent required" }),
});

const BookingInput = z.object({
  listingId: z.string(),
  slotId: z.string(),
  buyerName: z.string().min(2).max(120),
  buyerPhone: z.string().min(7).max(20),
  prequal: Prequal,
});

// POST /api/bookings — public, rate-limited upstream. Creates Requested,
// locks slot capacity in a transaction, mints OTP, sends booking_confirm.
export async function POST(req: Request) {
  if (!rateLimit(`bookings:${clientKey(req)}`, 20))
    return NextResponse.json({ ok: false, error: "Too many requests — try later" }, { status: 429 });
  const parsed = BookingInput.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const full = await prisma.listing.findUnique({
    where: { id: d.listingId },
    include: { agency: true, agent: true },
  });
  if (!full) return NextResponse.json({ ok: false, error: "Listing not found" }, { status: 404 });
  if (full.status !== "Active")
    return NextResponse.json({ ok: false, error: "Listing is not bookable right now" }, { status: 409 });
  const stale =
    Date.now() - full.lastConfirmedAt.getTime() >
    full.agency.refreshIntervalDays * 24 * 60 * 60 * 1000;
  if (stale)
    return NextResponse.json({ ok: false, error: "Listing is paused — awaiting agency reconfirmation" }, { status: 409 });

  const slot = await prisma.slot.findUnique({ where: { id: d.slotId } });
  if (!slot || slot.listingId !== full.id)
    return NextResponse.json({ ok: false, error: "Slot not found" }, { status: 404 });
  if (slot.startsAt.getTime() < Date.now())
    return NextResponse.json({ ok: false, error: "Slot is in the past" }, { status: 422 });

  // Idempotency: same buyer+slot non-cancelled within 10 min → return existing.
  const recent = await prisma.booking.findFirst({
    where: {
      slotId: slot.id,
      buyerPhone: d.buyerPhone,
      status: { in: ["Requested", "Confirmed"] as never },
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (recent) return NextResponse.json({ ok: true, booking: serialize(recent), deduped: true });

  const { hash, expires } = generateOtp();

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const upd = await tx.slot.updateMany({
        where: { id: slot.id, bookedCount: { lt: slot.capacity } },
        data: { bookedCount: { increment: 1 } },
      });
      if (upd.count === 0) throw new Error("Slot full");
      return tx.booking.create({
        data: {
          listingId: full.id,
          slotId: slot.id,
          buyerName: d.buyerName,
          buyerPhone: d.buyerPhone,
          prequal: d.prequal as object,
          status: "Requested" as never,
          otpHash: hash,
          otpExpires: expires,
          agentId: full.agentId,
        },
      });
    });

    await audit({ actor: `buyer:${d.buyerPhone}`, entity: "booking", entityId: booking.id, action: "request", diff: { slot: slot.id } });

    // Fire-and-forget WhatsApp (outside 24h window → template, free tier).
    void (async () => {
      try {
        const res = (await sendWhatsApp({
          to: d.buyerPhone,
          template: "booking_confirm",
          components: [],
        })) as { messages?: { id: string }[]; skipped?: boolean };
        await prisma.waMessage.create({
          data: { bookingId: booking.id, template: "booking_confirm", wamid: res?.messages?.[0]?.id, status: res?.skipped ? "skipped" : "sent" },
        });
      } catch (e) {
        await prisma.waMessage.create({
          data: { bookingId: booking.id, template: "booking_confirm", status: "failed" },
        });
        console.warn("[booking_confirm] send failed", e);
      }
    })();

    return NextResponse.json({ ok: true, booking: serialize(booking) }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "Slot full")
      return NextResponse.json({ ok: false, error: "Slot just filled — pick another" }, { status: 409 });
    throw e;
  }
}

function serialize(b: { id: string; status: unknown; otpExpires: Date | null }) {
  return { id: b.id, status: b.status, otpExpires: b.otpExpires };
}
