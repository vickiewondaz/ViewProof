import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { buildWeeklyReport, formatWeeklyText } from "@/lib/weekly";
import { sendWhatsApp, siteUrl } from "@/lib/whatsapp";

// GET /api/jobs/weekly-report — cron with x-cron-secret. Per agency:
// WhatsApp summary to the public contact + email to owner users.
// Opens tracked when owners fetch /api/reports/weekly (pilot metric ≥3/4 wks).
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ ok: false }, { status: 401 });

  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;
  const from = process.env.EMAIL_FROM ?? "ViewProof <login@viewproof.app>";

  const agencies = await prisma.agency.findMany({
    select: { id: true, name: true, contactPublic: true },
  });
  let done = 0;
  for (const a of agencies) {
    const report = await buildWeeklyReport(a.id);
    const completed = report.bookings["Completed"] ?? 0;
    const upcoming = (report.bookings["Requested"] ?? 0) + (report.bookings["Confirmed"] ?? 0);
    const active = report.listings["Active"] ?? 0;
    const stale = report.listings["StalePaused"] ?? 0;
    const openIssues = Object.values(report.issues).reduce((x, y) => x + y, 0);

    try {
      await sendWhatsApp({
        to: a.contactPublic,
        template: "weekly_summary",
        params: [
          a.name,
          String(completed),
          String(upcoming),
          String(active),
          String(stale),
          openIssues ? `${openIssues} issue(s) need your eyes.` : "No buyer issues.",
          `${siteUrl()}/dashboard`,
        ],
      });
    } catch (e) {
      console.warn("[weekly-report] whatsapp failed", a.id, e);
    }

    if (resend) {
      const owners = await prisma.user.findMany({
        where: { agencyId: a.id, role: { in: ["owner", "admin"] } },
        select: { email: true },
      });
      for (const o of owners) {
        if (!o.email || o.email.endsWith("@viewproof.local")) continue;
        await resend.emails.send({
          from,
          to: o.email,
          subject: `Your ViewProof week: ${completed} viewings done`,
          text: `${formatWeeklyText(a.name, report)}\n\nFull numbers + CSV: ${siteUrl()}/dashboard\n\n— ViewProof`,
        }).catch((e) => console.warn("[weekly-report] email failed", e));
      }
    }

    await prisma.auditLog.create({
      data: {
        actor: "system",
        entity: "agency",
        entityId: a.id,
        action: "weekly-report",
        diff: { bookings: report.bookings } as object,
      },
    });
    done++;
  }
  return NextResponse.json({ ok: true, agencies: done });
}
