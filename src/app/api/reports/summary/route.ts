import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser, agencyScope } from "@/lib/session";

// GET /api/reports/summary — owner/agent dashboard aggregate, agency-scoped.
// Stale computed live (not just stored status) so the queue never lies.
export async function GET() {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const agencyId = agencyScope(u);

  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) return NextResponse.json({ ok: false }, { status: 404 });

  const listings = await prisma.listing.findMany({
    where: u.role === "agent" ? { agencyId, agentId: u.id } : { agencyId },
    select: { id: true, status: true, lastConfirmedAt: true },
  });
  const intervalMs = agency.refreshIntervalDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const byStatus: Record<string, number> = {};
  let staleLive = 0;
  for (const l of listings) {
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    if (l.status === "Active" && now - l.lastConfirmedAt.getTime() > intervalMs) staleLive++;
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const bookingsToday = await prisma.booking.groupBy({
    by: ["status"],
    where: { listing: { agencyId }, createdAt: { gte: dayStart } },
    _count: true,
  });

  // Per-agent scorecard: assigned → confirmed → attended → mismatches.
  const agents = await prisma.agent.findMany({
    where: { agencyId },
    select: { id: true, publicName: true, fullName: true, active: true },
  });
  const scorecard = await Promise.all(
    agents.map(async (a) => {
      const [assigned, attended, noShows, mismatches] = await Promise.all([
        prisma.booking.count({ where: { agentId: a.id } }),
        prisma.booking.count({ where: { agentId: a.id, status: "Completed" as never } }),
        prisma.booking.count({ where: { agentId: a.id, status: { in: ["NoShowAgent", "NoShowBuyer"] as never } } }),
        prisma.issue.count({ where: { listing: { agentId: a.id } } }),
      ]);
      return {
        id: a.id,
        name: a.publicName ?? a.fullName,
        active: a.active,
        assigned,
        attended,
        noShows,
        mismatches,
        attendedPct: assigned ? Math.round((attended / assigned) * 100) : 0,
      };
    })
  );

  const openIssues = await prisma.issue.count({
    where: { listing: { agencyId }, status: { in: ["Open", "UnderReview"] as never } },
  });

  return NextResponse.json({
    ok: true,
    summary: {
      listings: { total: listings.length, byStatus, staleLive },
      bookingsToday: Object.fromEntries(bookingsToday.map((b) => [b.status, b._count])),
      scorecard,
      openIssues,
    },
  });
}
