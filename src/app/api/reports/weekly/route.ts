import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser, agencyScope } from "@/lib/session";

// GET /api/reports/weekly — owner weekly operational report (PRD 7.8).
// ?format=csv for spreadsheet export. JSON default for dashboard + WhatsApp job.
export async function GET(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.role !== "owner" && u.role !== "reviewer" && u.role !== "admin")
    return NextResponse.json({ ok: false }, { status: 403 });
  const agencyId = agencyScope(u);

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

  const report = {
    weekStarting: weekAgo.toISOString(),
    listings: Object.fromEntries(listings.map((l) => [l.status, l._count])),
    bookings: Object.fromEntries(bookings.map((b) => [b.status, b._count])),
    issues: Object.fromEntries(issues.map((i) => [i.category, i._count])),
    attendance,
  };

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const lines = ["section,key,value"];
    for (const [k, v] of Object.entries(report.listings)) lines.push(`listings,${k},${v}`);
    for (const [k, v] of Object.entries(report.bookings)) lines.push(`bookings,${k},${v}`);
    for (const [k, v] of Object.entries(report.issues)) lines.push(`issues,${k},${v}`);
    for (const a of attendance) lines.push(`attendance,${a.agent} assigned,${a.assigned}`, `attendance,${a.agent} attended,${a.attended}`);
    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=viewproof-weekly.csv" },
    });
  }
  return NextResponse.json({ ok: true, report });
}
