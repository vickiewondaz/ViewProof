import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope, findRosterAgent } from "@/lib/session";
import { generateOtp } from "@/lib/otp";
import { sendWhatsApp, fmtDateTime, siteUrl } from "@/lib/whatsapp";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { notifyAgency } from "@/lib/push";

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

// GET /api/bookings?day=today|tomorrow|upcoming — staff only. Agent sees
// own roster bookings; owner sees the whole agency. Includes buyer contact
// (staff-only) plus listing + slot + host for ops views.
export async function GET(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const scope = agencyScope(u);
  const day = new URL(req.url).searchParams.get("day") ?? "today";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const upcoming = day === "upcoming";
  const end = new Date(start.getTime() + (day === "tomorrow" ? 2 : 1) * 24 * 3600e3);
  const from = upcoming ? new Date() : day === "tomorrow" ? new Date(start.getTime() + 24 * 3600e3) : start;
  // Auth user ≠ Agent row: match roster by phone within the agency.
  let agentRow: string | undefined;
  if (u.role === "agent" && u.phoneNumber) {
    agentRow = (await findRosterAgent(scope, u.phoneNumber))?.id;
  }
  const bookings = await prisma.booking.findMany({
    where: {
      listing: { agencyId: scope },
      ...(u.role === "agent" ? { agentId: agentRow ?? "__none__" } : {}),
      ...(upcoming
        ? {
            status: { in: ["Requested", "Confirmed"] as never },
            slot: { startsAt: { gte: from } },
          }
        : { slot: { startsAt: { gte: from, lt: end } } }),
    },
    include: {
      listing: { select: { title: true, area: true } },
      slot: { select: { startsAt: true } },
      agent: { select: { publicName: true, fullName: true } },
    },
    orderBy: { slot: { startsAt: "asc" } },
    take: 100,
  });
  return NextResponse.json({ ok: true, bookings });
}

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
  if (full.agency.status === "Suspended")
    return NextResponse.json({ ok: false, error: "This agency is paused — talk to them directly." }, { status: 403 });
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

    // The plain code goes to the buyer over WhatsApp only — never logs/responses.
    const { code, hash, expires } = generateOtp();

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

    // Fire-and-forget notifications (templates work outside the 24h window).
    const hostName =
      full.agent?.publicName ?? full.agent?.fullName?.split(" ")[0] ?? "your host";
    const when = fmtDateTime(slot.startsAt);
    void (async () => {
      // 1. Buyer: booking requested + meeting code.
      try {
        const res = await sendWhatsApp({
          to: d.buyerPhone,
          template: "booking_confirm",
          params: [d.buyerName, full.title, when, "requested", hostName, full.agency.name, code],
        });
        await prisma.waMessage.create({
          data: { bookingId: booking.id, template: "booking_confirm", wamid: "skipped" in res ? undefined : res.messages?.[0]?.id, status: "skipped" in res ? "skipped" : "sent" },
        });
      } catch (e) {
        await prisma.waMessage.create({
          data: { bookingId: booking.id, template: "booking_confirm", status: "failed" },
        });
        console.warn("[booking_confirm] send failed", e);
      }
      // 2. Assigned agent: 1-tap confirm link (correct recipient — was buyer before).
      if (full.agent?.phone) {
        try {
          await sendWhatsApp({
            to: full.agent.phone,
            template: "agent_alert",
            params: [booking.id.slice(-6), d.buyerName, d.buyerPhone, full.title, when, `${siteUrl()}/agent`],
          });
          await prisma.waMessage.create({
            data: { bookingId: booking.id, template: "agent_alert", status: "sent" },
          });
        } catch (e) {
          await prisma.waMessage.create({
            data: { bookingId: booking.id, template: "agent_alert", status: "failed" },
          });
          console.warn("[agent_alert] send failed", e);
        }
      }
      // 3. Web Push to agency devices (WhatsApp stays primary).
      await notifyAgency(full.agencyId, `New viewing request: ${full.title} — ${when}`);
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
