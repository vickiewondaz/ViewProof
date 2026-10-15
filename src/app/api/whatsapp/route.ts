import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { verifyWebhookSignature } from "@/lib/whatsapp";

type WaText = { from?: string; text?: { body?: string } };

// POST inbound — signature-verified (WHATSAPP_APP_SECRET from Meta dashboard).
// Unsigned or forged requests are dropped before parsing: nobody can fake a
// CANCEL and kill bookings. Handles CANCEL; HELP/YES logged only.
export async function POST(req: Request) {
  // Verify on the RAW body — parse only after the signature checks out.
  const raw = await req.text().catch(() => "");
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    const ok = await verifyWebhookSignature(raw, req.headers.get("x-hub-signature-256"), secret);
    if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  } else {
    console.warn("[whatsapp] WHATSAPP_APP_SECRET unset — accepting unsigned inbound (dev only)");
  }
  let body: { entry?: { changes?: { value?: { messages?: WaText[] } }[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true, ignored: true });
  }
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

  // Logs carry metadata only — never message content (buyer words stay private).
  console.log(`[whatsapp inbound] unhandled keyword, ${msg.text.body.length} chars`);
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
