import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";

const Categories = [
  "unavailable",
  "price",
  "location",
  "agent-absent",
  "differs",
  "safety",
  "other",
] as const;

const Create = z.object({
  listingId: z.string(),
  bookingId: z.string().optional(),
  category: z.enum(Categories),
  detail: z.string().max(2000).optional(),
  photoUrl: z.string().url().max(2000).optional(),
});

// POST /api/issues — public (buyer link). Never auto-accuses; sets
// NeedsReview on listing where apt; timestamped audit; human triage later.
export async function POST(req: Request) {
  const parsed = Create.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
  if (!listing) return NextResponse.json({ ok: false }, { status: 404 });
  if (parsed.data.bookingId) {
    const b = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
    if (!b || b.listingId !== listing.id)
      return NextResponse.json({ ok: false, error: "Booking mismatch" }, { status: 400 });
  }

  const issue = await prisma.issue.create({ data: parsed.data });
  if (["unavailable", "price", "location", "differs", "agent-absent"].includes(parsed.data.category)) {
    await prisma.listing.update({ where: { id: listing.id }, data: { status: "NeedsReview" as never } });
  }
  if (parsed.data.bookingId) {
    await prisma.booking.update({ where: { id: parsed.data.bookingId }, data: { status: "NeedsReview" as never } }).catch(() => null);
  }
  await audit({ actor: "buyer", entity: "issue", entityId: issue.id, action: "report", diff: { category: issue.category } });
  return NextResponse.json(
    { ok: true, issue: { id: issue.id }, message: "Thank you. Sent to the agency for review. ViewProof makes no automatic decisions." },
    { status: 201 }
  );
}

// GET /api/issues?listingId= — owner/reviewer/agent-scoped inbox.
export async function GET(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const listingId = new URL(req.url).searchParams.get("listingId");
  const issues = await prisma.issue.findMany({
    where: {
      ...(listingId ? { listingId } : {}),
      listing: { agencyId: agencyScope(u) },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, issues });
}
