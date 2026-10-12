import { NextResponse } from "next/server";

// GET verify (Meta webhook handshake) + POST inbound (CANCEL/HELP/YES).
// TODO: verify X-Hub-Signature, route to booking state machine, audit.

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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // TODO Phase 3: parse messages, handle CANCEL -> CancelledByBuyer + audit + notify agent.
  console.log("[whatsapp inbound]", JSON.stringify(body).slice(0, 2000));
  return NextResponse.json({ ok: true });
}
