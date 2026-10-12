import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/jobs/weekly-report — cron with x-cron-secret. Aggregates per agency
// and logs a receipt-template send intent per agency contact (WhatsApp utility).
// Opens tracked when owners fetch /api/reports/weekly (pilot metric ≥3/4 wks).
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ ok: false }, { status: 401 });

  const agencies = await prisma.agency.findMany({ select: { id: true } });
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let done = 0;
  for (const a of agencies) {
    const counts = await prisma.booking.groupBy({
      by: ["status"],
      where: { listing: { agencyId: a.id }, createdAt: { gte: weekAgo } },
      _count: true,
    });
    await prisma.auditLog.create({
      data: {
        actor: "system",
        entity: "agency",
        entityId: a.id,
        action: "weekly-report",
        diff: { bookings: Object.fromEntries(counts.map((c) => [c.status, c._count])) } as object,
      },
    });
    done++;
    // TODO: sendWhatsApp receipt/utility summary to agency contact + email.
  }
  return NextResponse.json({ ok: true, agencies: done });
}
