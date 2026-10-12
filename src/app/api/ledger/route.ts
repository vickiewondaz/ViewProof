import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser, agencyScope } from "@/lib/session";

// GET /api/ledger — owner/reviewer commission evidence pack (PRD: the audit
// trail that settles "whose buyer was this?"). JSON default, ?format=csv.
// Every row: buyer → listing → agent → slot → check-in → outcome + receipt id.
// Nothing deleted, nothing invented — pure observed record.
export async function GET(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.role !== "owner" && u.role !== "reviewer" && u.role !== "admin")
    return NextResponse.json({ ok: false }, { status: 403 });

  const rows = await prisma.booking.findMany({
    where: {
      listing: { agencyId: agencyScope(u) },
      status: { in: ["Completed", "NoShowBuyer", "NoShowAgent", "NeedsReview"] as never },
    },
    include: {
      listing: { select: { title: true, area: true, price: true, currency: true } },
      slot: { select: { startsAt: true } },
      agent: { select: { publicName: true, fullName: true } },
    },
    orderBy: { checkinAt: "desc" },
    take: 500,
  });

  const pack = rows.map((b) => ({
    bookingId: b.id,
    buyer: b.buyerName,
    buyerPhone: b.buyerPhone,
    listing: b.listing.title,
    area: b.listing.area,
    price: b.listing.price.toString(),
    agent: b.agent?.publicName ?? b.agent?.fullName ?? "unassigned",
    scheduled: b.slot.startsAt,
    checkedIn: b.checkinAt,
    outcome: b.status,
    receipt: b.status === "Completed" ? b.id : null,
  }));

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const head = "booking,buyer,phone,listing,agent,scheduled,checked_in,outcome";
    const lines = pack.map((p) =>
      [p.bookingId, `"${p.buyer}"`, p.buyerPhone, `"${p.listing}"`, `"${p.agent}"`, p.scheduled.toISOString(), p.checkedIn?.toISOString() ?? "", p.outcome].join(",")
    );
    return new NextResponse([head, ...lines].join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=viewproof-ledger.csv" },
    });
  }
  return NextResponse.json({ ok: true, pack, note: "Observed record only — buyer identity as given at booking." });
}
