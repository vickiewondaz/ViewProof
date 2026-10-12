import { NextResponse } from "next/server";
import { getStaffUser, agencyScope } from "@/lib/session";
import { buildWeeklyReport } from "@/lib/weekly";

// GET /api/reports/weekly — owner weekly operational report (PRD 7.8).
// ?format=csv for spreadsheet export. JSON default for dashboard + WhatsApp job.
export async function GET(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.role !== "owner" && u.role !== "reviewer" && u.role !== "admin")
    return NextResponse.json({ ok: false }, { status: 403 });

  const report = await buildWeeklyReport(agencyScope(u));
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const lines = ["section,key,value"];
    for (const [k, v] of Object.entries(report.listings)) lines.push(`listings,${k},${v}`);
    for (const [k, v] of Object.entries(report.bookings)) lines.push(`bookings,${k},${v}`);
    for (const [k, v] of Object.entries(report.issues)) lines.push(`issues,${k},${v}`);
    for (const a of report.attendance) lines.push(`attendance,${a.agent} assigned,${a.assigned}`, `attendance,${a.agent} attended,${a.attended}`);
    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=viewproof-weekly.csv" },
    });
  }
  return NextResponse.json({ ok: true, report });
}
