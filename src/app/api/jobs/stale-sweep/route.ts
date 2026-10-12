import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

// GET /api/jobs/stale-sweep — Netlify Scheduled Function / external cron.
// Header: x-cron-secret must match CRON_SECRET. Sweeps Active → StalePaused
// when lastConfirmedAt + agency.refreshIntervalDays is exceeded.
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ ok: false }, { status: 401 });

  const actives = await prisma.listing.findMany({
    where: { status: "Active" },
    include: { agency: { select: { id: true, refreshIntervalDays: true } } },
    take: 500,
  });
  let paused = 0;
  for (const l of actives) {
    const ageMs = Date.now() - l.lastConfirmedAt.getTime();
    if (ageMs > l.agency.refreshIntervalDays * 24 * 60 * 60 * 1000) {
      await prisma.listing.update({ where: { id: l.id }, data: { status: "StalePaused" as never } });
      await audit({ actor: "system", entity: "listing", entityId: l.id, action: "auto-stale-pause", diff: {} });
      paused++;
      // TODO: WhatsApp refresh_nudge to owner (utility template) + dashboard banner.
    }
  }
  return NextResponse.json({ ok: true, checked: actives.length, paused });
}
