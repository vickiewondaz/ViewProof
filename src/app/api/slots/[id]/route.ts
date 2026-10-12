import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";

// DELETE /api/slots/[id] — staff only. Blocked when buyers already hold
// places (bookedCount > 0): cancel those bookings first, honestly.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const slot = await prisma.slot.findFirst({
    where: { id: params.id, listing: { agencyId: agencyScope(u) } },
  });
  if (!slot) return NextResponse.json({ ok: false }, { status: 404 });
  if (slot.bookedCount > 0)
    return NextResponse.json(
      { ok: false, error: `${slot.bookedCount} buyer(s) hold this time — ask them to rebook first.` },
      { status: 409 }
    );
  await prisma.slot.delete({ where: { id: slot.id } });
  await audit({ actor: u.id, entity: "slot", entityId: slot.id, action: "delete", diff: {} });
  return NextResponse.json({ ok: true });
}
