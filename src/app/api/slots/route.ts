import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";

const SlotCreate = z.object({
  listingId: z.string(),
  startsAt: z.coerce.date(),
  capacity: z.coerce.number().int().min(1).default(1),
});

// GET /api/slots?listingId= — staff scoped; public reads via /api/cards/[slug].
export async function GET(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const listingId = new URL(req.url).searchParams.get("listingId");
  const slots = await prisma.slot.findMany({
    where: {
      ...(listingId ? { listingId } : {}),
      listing: { agencyId: agencyScope(u) },
    },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, slots });
}

export async function POST(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = SlotCreate.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  const listing = await prisma.listing.findFirst({
    where: { id: parsed.data.listingId, agencyId: agencyScope(u) },
  });
  if (!listing) return NextResponse.json({ ok: false }, { status: 404 });
  if (parsed.data.startsAt.getTime() < Date.now() - 60_000)
    return NextResponse.json({ ok: false, error: "Slot must be in the future" }, { status: 422 });
  const slot = await prisma.slot.create({ data: parsed.data });
  await audit({ actor: u.id, entity: "slot", entityId: slot.id, action: "create", diff: parsed.data });
  return NextResponse.json({ ok: true, slot }, { status: 201 });
}
