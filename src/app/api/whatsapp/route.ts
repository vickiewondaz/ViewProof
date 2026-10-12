import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

type WaText = { from?: string; text?: { body?: string } };

// POST inbound — handles CANCEL (buyer cancels latest active booking from
// that sender), HELP/YES (log only). Signature verification TODO with
// WHATSAPP_APP_SECRET when production number is attached.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const entry = body?.entry?.[0]?.changes?.[0]?.value;
  const msg: WaText | undefined = entry?.messages?.[0];

  if (!msg?.from || !msg?.text?.body) {
    console.log("[whatsapp inbound] non-text event, ignored");
    return NextResponse.json({ ok: true, ignored: true });
  }

  const text = msg.text.body.trim().toUpperCase();
  if (text === "CANCEL") {
    const b = await prisma.booking.findFirst({
      where: {
        buyerPhone: { in: [msg.from, `+${msg.from}`] },
        status: { in: ["Requested", "Confirmed"] as never },
      },
      orderBy: { createdAt: "desc" },
    });
    if (b) {
      await prisma.booking.update({ where: { id: b.id }, data: { status: "CancelledByBuyer" as never } });
      await prisma.slot.update({ where: { id: b.slotId }, data: { bookedCount: { decrement: 1 } } }).catch(() => null);
      await audit({ actor: `buyer:${msg.from}`, entity: "booking", entityId: b.id, action: "cancel-whatsapp", diff: {} });
      return NextResponse.json({ ok: true, cancelled: b.id });
    }
    return NextResponse.json({ ok: true, cancelled: null });
  }

  console.log(`[whatsapp inbound] ${msg.from}: ${msg.text.body.slice(0, 200)}`);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ ok: false }, { status: 403 });
}
