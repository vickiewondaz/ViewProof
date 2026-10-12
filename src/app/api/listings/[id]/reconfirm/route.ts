import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";

// POST /api/listings/[id]/reconfirm — 1-tap freshness reset (incl. WhatsApp link).
// Only explicit reconfirm moves the stale clock. Unpauses StalePaused → Active
// only if the Active gate still holds; else → NeedsReview.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const existing = await prisma.listing.findFirst({
    where: { id: params.id, agencyId: agencyScope(u) },
  });
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  const freshPhoto =
    existing.photographedAt &&
    Date.now() - existing.photographedAt.getTime() < 30 * 24 * 60 * 60 * 1000;
  const gateOk =
    existing.imageUrls.length > 0 && !!freshPhoto && !!existing.agentId;
  const nextStatus =
    existing.status === "StalePaused" || existing.status === "NeedsReview"
      ? gateOk
        ? "Active"
        : "NeedsReview"
      : existing.status;

  const updated = await prisma.listing.update({
    where: { id: params.id },
    data: { lastConfirmedAt: new Date(), status: nextStatus as never },
  });
  await audit({ actor: u.id, entity: "listing", entityId: updated.id, action: "reconfirm", diff: { status: nextStatus } });
  return NextResponse.json({ ok: true, listing: updated });
}
