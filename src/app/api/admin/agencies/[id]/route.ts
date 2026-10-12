import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/admin";

const Patch = z.object({ status: z.enum(["Active", "Suspended"]) });

// PATCH /api/admin/agencies/[id] — lock or reopen a shop.
// Suspend hides cards + blocks bookings; history and audit stay untouched.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false }, { status: gate.status });
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const agency = await prisma.agency.findUnique({ where: { id: params.id } });
  if (!agency) return NextResponse.json({ ok: false }, { status: 404 });
  const updated = await prisma.agency.update({
    where: { id: agency.id },
    data: { status: parsed.data.status as never },
  });
  await audit({
    actor: gate.user.id,
    entity: "agency",
    entityId: agency.id,
    action: parsed.data.status === "Suspended" ? "suspend" : "reactivate",
    diff: {},
  });
  return NextResponse.json({ ok: true, agency: { id: updated.id, status: updated.status } });
}
