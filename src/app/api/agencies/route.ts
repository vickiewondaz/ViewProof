import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser } from "@/lib/session";

const Create = z.object({
  name: z.string().min(2).max(120),
  contactPublic: z.string().min(7).max(30),
  areas: z.array(z.string().min(1).max(120)).min(1).max(20),
  policyText: z.string().max(2000).optional(),
});

// POST /api/agencies — any signed-in user can found an agency and becomes its
// owner. Without this, nobody could ever get agency access (critical path).
export async function POST(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.agencyId)
    return NextResponse.json({ ok: false, error: "You already belong to an agency." }, { status: 409 });
  const parsed = Create.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const agency = await prisma.agency.create({ data: parsed.data });
  await prisma.user.update({
    where: { id: u.id },
    data: { role: "owner", agencyId: agency.id },
  });
  await audit({ actor: u.id, entity: "agency", entityId: agency.id, action: "create", diff: {} });
  return NextResponse.json({ ok: true, agency }, { status: 201 });
}
