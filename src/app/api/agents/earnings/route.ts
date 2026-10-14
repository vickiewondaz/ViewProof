import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser, agencyScope, findRosterAgent } from "@/lib/session";

// GET /api/agents/earnings — my closed deals: price, terms, payout state.
// Read-only proof of what's owed. Money moves off-platform; this is the record.
export async function GET() {
  const u = await getStaffUser().catch(() => null);
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const row = u.phoneNumber ? await findRosterAgent(agencyScope(u), u.phoneNumber) : null;
  if (!row) return NextResponse.json({ ok: false, error: "Link your agent spot first." }, { status: 403 });

  const deals = await prisma.booking.findMany({
    where: { agentId: row.id, closedPrice: { not: null } },
    orderBy: { closedAt: "desc" },
    take: 50,
    select: {
      id: true, buyerName: true, closedPrice: true, closedAt: true,
      payoutStatus: true, paidAt: true, listingId: true,
      listing: { select: { title: true, area: true, currency: true, commissionTerms: true } },
    },
  });
  const agreed = await prisma.commissionAgreement.findMany({
    where: { agentId: row.id },
    select: { listingId: true },
  });
  const agreedSet = new Set(agreed.map((a) => a.listingId));
  return NextResponse.json({
    ok: true,
    deals: deals.map((d) => ({
      id: d.id.slice(-6).toUpperCase(),
      buyer: d.buyerName,
      listing: d.listing.title,
      area: d.listing.area,
      price: d.closedPrice ? `${d.listing.currency} ${Number(d.closedPrice).toLocaleString()}` : "",
      terms: d.listing.commissionTerms ?? "",
      payout: d.payoutStatus ?? "Pending",
      paidAt: d.paidAt,
      closedAt: d.closedAt,
      agreed: agreedSet.has(d.listingId),
    })),
  });
}
