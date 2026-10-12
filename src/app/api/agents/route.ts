import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";

const Create = z.object({
  fullName: z.string().min(2).max(120),
  publicName: z.string().min(1).max(60).optional(),
  phone: z.string().min(7).max(20),
});

// GET /api/agents — staff-scoped roster (for assignment dropdowns, scorecard).
export async function GET() {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const agents = await prisma.agent.findMany({
    where: { agencyId: agencyScope(u) },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, publicName: true, phone: true, active: true },
  });
  return NextResponse.json({ ok: true, agents });
}

// POST /api/agents — owner only.
export async function POST(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.role !== "owner" && u.role !== "admin")
    return NextResponse.json({ ok: false }, { status: 403 });
  if (!u.agencyId) return NextResponse.json({ ok: false }, { status: 403 });
  const parsed = Create.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  const agent = await prisma.agent.create({
    data: {
      agencyId: u.agencyId,
      fullName: parsed.data.fullName,
      publicName: parsed.data.publicName ?? parsed.data.fullName.split(" ")[0],
      phone: parsed.data.phone,
    },
  });
  await audit({ actor: u.id, entity: "agent", entityId: agent.id, action: "create", diff: {} });
  return NextResponse.json({ ok: true, agent }, { status: 201 });
}
