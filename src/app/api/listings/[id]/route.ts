import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";
import { ListingUpdate, activeGate } from "@/lib/listings";

async function scoped(id: string, agencyId: string) {
  return prisma.listing.findFirst({ where: { id, agencyId } });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const l = await scoped(params.id, agencyScope(u));
  if (!l) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, listing: l });
}

// PUT — any fact change keeps lastConfirmedAt (stale clock) unless reconfirmed.
// Never auto-publish AI drafts: status transitions to Active always gated.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const existing = await scoped(params.id, agencyScope(u));
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });
  if (u.role === "agent" && existing.agentId !== u.id)
    return NextResponse.json({ ok: false }, { status: 403 });

  const json = await req.json().catch(() => ({}));
  const parsed = ListingUpdate.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const next = { ...existing, ...d } as typeof existing & {
    imageUrls: string[];
    photographedAt: Date | null;
    agentId: string | null;
  };
  if ((d.status ?? existing.status) === "Active") {
    const missing = activeGate({
      imageUrls: (d.imageUrls as string[]) ?? existing.imageUrls,
      photographedAt: (d.photographedAt as Date | undefined) ?? existing.photographedAt ?? undefined,
      agentId: (d.agentId as string | undefined) ?? existing.agentId ?? undefined,
    });
    if (missing.length)
      return NextResponse.json(
        { ok: false, error: `Missing for Active: ${missing.join("; ")}` },
        { status: 422 }
      );
  }
  void next;
  const updated = await prisma.listing.update({
    where: { id: params.id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.type !== undefined && { type: d.type as never }),
      ...(d.area !== undefined && { area: d.area }),
      ...(d.price !== undefined && { price: d.price }),
      ...(d.currency !== undefined && { currency: d.currency }),
      ...(d.agentId !== undefined && { agentId: d.agentId }),
      ...(d.imageUrls !== undefined && { imageUrls: d.imageUrls }),
      ...(d.photographedAt !== undefined && { photographedAt: d.photographedAt }),
      ...(d.features !== undefined && { features: d.features as object }),
      ...(d.accessRef !== undefined && { accessRef: d.accessRef }),
      ...(d.internalNotes !== undefined && { internalNotes: d.internalNotes }),
      ...(d.status !== undefined && { status: d.status as never }),
      // Fact edits do NOT refresh the stale clock; only /reconfirm does.
    },
  });
  await audit({ actor: u.id, entity: "listing", entityId: updated.id, action: "update", diff: d });
  return NextResponse.json({ ok: true, listing: updated });
}
