import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin";

// GET /api/admin/overview — platform command numbers + latest audit trail.
// Superadmin only. Read-only: decisions still happen on the action screens.
export async function GET(req: Request) {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false }, { status: gate.status });

  const since = new URL(req.url).searchParams.get("days") === "30" ? 30 : 7;
  const from = new Date(Date.now() - since * 24 * 3600e3);

  const [
    agencies, listings, bookings, users, agents,
    attended, noShows, closed, issues, audit,
  ] = await Promise.all([
    prisma.agency.count(),
    prisma.listing.count(),
    prisma.booking.count({ where: { createdAt: { gte: from } } }),
    prisma.user.count(),
    prisma.agent.count({ where: { active: true } }),
    prisma.booking.count({ where: { status: "Completed", createdAt: { gte: from } } }),
    prisma.booking.count({ where: { status: { in: ["NoShowBuyer", "NoShowAgent"] }, createdAt: { gte: from } } }),
    prisma.booking.findMany({
      where: { closedAt: { gte: from } },
      select: { closedPrice: true, listing: { select: { currency: true } } },
      take: 500,
    }),
    prisma.issue.count({ where: { status: { not: "Resolved" } } }),
    prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 30 }),
  ]);

  const volume = closed.reduce((n, b) => n + Number(b.closedPrice ?? 0), 0);
  const currency = closed[0]?.listing.currency ?? "NGN";
  return NextResponse.json({
    ok: true,
    days: since,
    stats: { agencies, listings, bookings, users, agents, attended, noShows, closed: closed.length, volume, currency, openIssues: issues },
    audit: audit.map((a) => ({
      at: a.at, actor: a.actor.slice(0, 8), entity: a.entity, action: a.action, ref: a.entityId.slice(-6),
    })),
  });
}
