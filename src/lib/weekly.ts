import { prisma } from "./db";

export type WeeklyReport = {
  weekStarting: string;
  listings: Record<string, number>;
  bookings: Record<string, number>;
  issues: Record<string, number>;
  attendance: { agent: string; assigned: number; attended: number }[];
};

// Single source of truth for the owner weekly report (PRD 7.8).
// Used by GET /api/reports/weekly and the cron fan-out job.
export async function buildWeeklyReport(agencyId: string): Promise<WeeklyReport> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [listings, bookings, issues, agents] = await Promise.all([
    prisma.listing.groupBy({ by: ["status"], where: { agencyId }, _count: true }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { listing: { agencyId }, createdAt: { gte: weekAgo } },
      _count: true,
    }),
    prisma.issue.groupBy({
      by: ["category"],
      where: { listing: { agencyId }, createdAt: { gte: weekAgo } },
      _count: true,
    }),
    prisma.agent.findMany({ where: { agencyId }, select: { id: true, publicName: true, fullName: true } }),
  ]);
  const attendance = await Promise.all(
    agents.map(async (a) => {
      const [assigned, attended] = await Promise.all([
        prisma.booking.count({ where: { agentId: a.id, createdAt: { gte: weekAgo } } }),
        prisma.booking.count({ where: { agentId: a.id, status: "Completed" as never, createdAt: { gte: weekAgo } } }),
      ]);
      return { agent: a.publicName ?? a.fullName, assigned, attended };
    })
  );
  return {
    weekStarting: weekAgo.toISOString(),
    listings: Object.fromEntries(listings.map((l) => [l.status, l._count])),
    bookings: Object.fromEntries(bookings.map((b) => [b.status, b._count])),
    issues: Object.fromEntries(issues.map((i) => [i.category, i._count])),
    attendance,
  };
}

const n = (o: Record<string, number>, k: string) => o[k] ?? 0;

// Plain-words summary for WhatsApp/email. Numbers only, no adjectives.
export function formatWeeklyText(agencyName: string, r: WeeklyReport): string {
  const completed = n(r.bookings, "Completed");
  const upcoming = n(r.bookings, "Requested") + n(r.bookings, "Confirmed");
  const openIssues = Object.values(r.issues).reduce((a, b) => a + b, 0);
  const active = n(r.listings, "Active");
  const stale = n(r.listings, "StalePaused");
  const lines = [
    `ViewProof weekly for ${agencyName}:`,
    `${completed} viewing(s) completed, ${upcoming} upcoming.`,
    `${active} live listings, ${stale} paused as stale.`,
    openIssues ? `${openIssues} buyer issue(s) need your eyes.` : "No buyer issues. Nice.",
  ];
  const stars = r.attendance
    .filter((a) => a.assigned > 0)
    .map((a) => `${a.agent}: ${a.attended}/${a.assigned} attended`)
    .join("; ");
  if (stars) lines.push(stars + ".");
  return lines.join("\n");
}
