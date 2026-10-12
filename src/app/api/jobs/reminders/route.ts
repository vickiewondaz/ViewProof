import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsApp } from "@/lib/whatsapp";

// GET /api/jobs/reminders — cron with x-cron-secret. Sends 24h + 2h utility
// reminders for Confirmed bookings; skips already-reminded via wa_messages.
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ ok: false }, { status: 401 });

  const now = Date.now();
  const windows = [
    { template: "reminder_24h" as const, from: 23 * 3600e3, to: 25 * 3600e3 },
    { template: "reminder_2h" as const, from: 1 * 3600e3, to: 3 * 3600e3 },
  ];
  let sent = 0;
  for (const w of windows) {
    const bookings = await prisma.booking.findMany({
      where: {
        status: "Confirmed" as never,
        slot: { startsAt: { gte: new Date(now + w.from), lte: new Date(now + w.to) } },
      },
      include: { slot: true },
      take: 200,
    });
    for (const b of bookings) {
      const already = await prisma.waMessage.findFirst({
        where: { bookingId: b.id, template: w.template },
      });
      if (already) continue;
      try {
        await sendWhatsApp({ to: b.buyerPhone, template: w.template, components: [] });
        await prisma.waMessage.create({
          data: { bookingId: b.id, template: w.template, status: "sent" },
        });
        sent++;
      } catch (e) {
        await prisma.waMessage.create({
          data: { bookingId: b.id, template: w.template, status: "failed" },
        });
        console.warn(`[reminders:${w.template}] failed`, e);
      }
    }
  }
  return NextResponse.json({ ok: true, sent });
}
