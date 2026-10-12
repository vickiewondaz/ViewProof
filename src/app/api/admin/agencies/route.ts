import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";

// GET /api/admin/agencies — every shop on one screen with live counts.
export async function GET() {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false }, { status: gate.status });
  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { listings: true, agents: true } },
    },
    take: 100,
  });
  const owners = await prisma.user.findMany({
    where: { role: { in: ["owner", "admin"] } },
    select: { email: true, agencyId: true },
  });
  const ownerByAgency = new Map(
    owners.filter((o) => o.agencyId).map((o) => [o.agencyId as string, o.email])
  );
  return NextResponse.json({
    ok: true,
    agencies: agencies.map((a) => ({
      id: a.id,
      name: a.name,
      contact: a.contactPublic,
      status: a.status,
      createdAt: a.createdAt,
      listings: a._count.listings,
      agents: a._count.agents,
      owner: ownerByAgency.get(a.id) ?? null,
    })),
  });
}
