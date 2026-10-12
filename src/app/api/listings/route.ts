import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope, findRosterAgent } from "@/lib/session";
import { ListingCreate, activeGate, slugify } from "@/lib/listings";

// GET /api/listings — staff only, scoped to agency.
export async function GET() {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const scope = agencyScope(u);
  let agentRow: string | undefined;
  if (u.role === "agent" && u.phoneNumber) {
    agentRow = (await findRosterAgent(scope, u.phoneNumber))?.id;
  }
  const listings = await prisma.listing.findMany({
    where: u.role === "agent" ? { agencyId: scope, agentId: agentRow ?? "__none__" } : { agencyId: scope },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      agent: { select: { publicName: true, fullName: true } },
      _count: { select: { slots: true, bookings: true } },
    },
  });
  return NextResponse.json({ ok: true, listings });
}

// POST /api/listings — owner: any status (gated); agent: Draft only.
export async function POST(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (!u.agencyId)
    return NextResponse.json({ ok: false, error: "No agency" }, { status: 403 });
  const json = await req.json().catch(() => ({}));
  const parsed = ListingCreate.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  if (u.role === "agent" && d.status !== "Draft")
    return NextResponse.json(
      { ok: false, error: "Agents may only create drafts" },
      { status: 403 }
    );
  if (d.status === "Active") {
    const missing = activeGate({
      imageUrls: d.imageUrls,
      photographedAt: d.photographedAt,
      agentId: d.agentId,
    });
    if (missing.length)
      return NextResponse.json(
        { ok: false, error: `Missing for Active: ${missing.join("; ")}` },
        { status: 422 }
      );
  }
  const agency = await prisma.agency.findUnique({ where: { id: u.agencyId } });
  if (!agency) return NextResponse.json({ ok: false }, { status: 404 });

  const listing = await prisma.listing.create({
    data: {
      agencyId: u.agencyId,
      agentId: d.agentId,
      title: d.title,
      type: d.type as never,
      area: d.area,
      price: d.price,
      currency: d.currency,
      status: d.status as never,
      imageUrls: d.imageUrls,
      photographedAt: d.photographedAt,
      features: (d.features ?? {}) as object,
      accessRef: d.accessRef,
      internalNotes: d.internalNotes,
      // Terms are the owner's call — agents can't promise themselves a cut.
      commissionTerms: u.role === "agent" ? undefined : d.commissionTerms,
      slug: slugify(d.title, d.area),
      lastConfirmedAt: new Date(),
    },
  });
  await audit({ actor: u.id, entity: "listing", entityId: listing.id, action: "create", diff: d });
  return NextResponse.json({ ok: true, listing }, { status: 201 });
}
