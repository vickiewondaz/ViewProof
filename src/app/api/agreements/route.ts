import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope, findRosterAgent } from "@/lib/session";

async function myRoster() {
  const u = await getStaffUser();
  if (!u) return { status: 401 as const };
  const row = u.phoneNumber ? await findRosterAgent(agencyScope(u), u.phoneNumber) : null;
  if (!row) return { status: 403 as const, error: "Link your agent spot first." };
  return { u, row };
}

// GET /api/agreements — my signed commission agreements (agent) with terms.
export async function GET() {
  const m = await myRoster();
  if ("error" in m || m.status) return NextResponse.json({ ok: false, error: m.error }, { status: m.status });
  const list = await prisma.commissionAgreement.findMany({
    where: { agentId: m.row.id },
    orderBy: { agreedAt: "desc" },
  });
  const listings = await prisma.listing.findMany({
    where: { id: { in: list.map((a) => a.listingId) } },
    select: { id: true, title: true, area: true, commissionTerms: true },
  });
  const byId = new Map(listings.map((l) => [l.id, l]));
  return NextResponse.json({
    ok: true,
    agreements: list.map((a) => ({
      listingId: a.listingId,
      listing: byId.get(a.listingId)?.title ?? "Removed listing",
      area: byId.get(a.listingId)?.area ?? "",
      terms: a.terms,
      agreedAt: a.agreedAt,
    })),
  });
}

const Agree = z.object({ listingId: z.string().min(1) });

// POST /api/agreements { listingId } — agent accepts the CURRENT terms.
// Snapshot stored; later owner edits don't rewrite what was agreed.
export async function POST(req: Request) {
  const m = await myRoster();
  if ("error" in m || m.status) return NextResponse.json({ ok: false, error: m.error }, { status: m.status });
  const parsed = Agree.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const listing = await prisma.listing.findFirst({
    where: { id: parsed.data.listingId, agencyId: m.u!.agencyId! },
    select: { id: true, commissionTerms: true, title: true },
  });
  if (!listing) return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  if (!listing.commissionTerms)
    return NextResponse.json({ ok: false, error: "No terms set yet — ask your owner to write them first." }, { status: 409 });
  const existing = await prisma.commissionAgreement.findUnique({
    where: { agentId_listingId: { agentId: m.row.id, listingId: listing.id } },
  });
  if (existing) return NextResponse.json({ ok: true, agreed: true, repeat: true });
  const a = await prisma.commissionAgreement.create({
    data: { agentId: m.row.id, listingId: listing.id, terms: listing.commissionTerms },
  });
  await audit({ actor: m.u!.id!, entity: "agreement", entityId: a.id, action: "agree", diff: { listing: listing.id } });
  return NextResponse.json({ ok: true, agreed: true }, { status: 201 });
}
