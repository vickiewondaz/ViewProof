import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendWhatsApp, siteUrl } from "@/lib/whatsapp";

// GET /api/jobs/stale-sweep — Netlify Scheduled Function / external cron.
// Header: x-cron-secret must match CRON_SECRET. Sweeps Active → StalePaused
// when lastConfirmedAt + agency.refreshIntervalDays is exceeded.
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ ok: false }, { status: 401 });

  const actives = await prisma.listing.findMany({
    where: { status: "Active" },
    include: { agency: { select: { id: true, name: true, contactPublic: true, refreshIntervalDays: true } } },
    take: 500,
  });
  let paused = 0;
  const perAgency = new Map<string, { name: string; contact: string; count: number }>();
  for (const l of actives) {
    const ageMs = Date.now() - l.lastConfirmedAt.getTime();
    if (ageMs > l.agency.refreshIntervalDays * 24 * 60 * 60 * 1000) {
      await prisma.listing.update({ where: { id: l.id }, data: { status: "StalePaused" as never } });
      await audit({ actor: "system", entity: "listing", entityId: l.id, action: "auto-stale-pause", diff: {} });
      paused++;
      const cur = perAgency.get(l.agency.id) ?? { name: l.agency.name, contact: l.agency.contactPublic, count: 0 };
      cur.count++;
      perAgency.set(l.agency.id, cur);
    }
  }
  // One nudge per agency (1-tap reconfirm link keeps booking open).
  let nudged = 0;
  for (const a of Array.from(perAgency.values())) {
    try {
      await sendWhatsApp({
        to: a.contact,
        template: "refresh_nudge",
        params: [a.name, String(a.count), `${siteUrl()}/dashboard`],
      });
      nudged++;
    } catch (e) {
      console.warn("[refresh_nudge] send failed", e);
    }
  }
  return NextResponse.json({ ok: true, checked: actives.length, paused, nudged });
}
