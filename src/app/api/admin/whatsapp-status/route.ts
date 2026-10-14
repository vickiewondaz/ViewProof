import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";

const API = "https://graph.facebook.com/v21.0";
const WANT = [
  "agent_login_code",
  "booking_confirm",
  "reminder_24h",
  "reminder_2h",
  "agent_alert",
  "refresh_nudge",
  "receipt",
  "weekly_summary",
  "deal_closed",
];

// GET /api/admin/whatsapp-status — landlord-only live health of WhatsApp:
// token alive? which templates approved? Never exposes the token itself.
export async function GET() {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false }, { status: gate.status });

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.PHONE_NUMBER_ID;
  const { smsBalance } = await import("@/lib/sms");
  const balance = await smsBalance();
  if (!token || !phoneId)
    return NextResponse.json({ ok: true, token: "missing", templates: [], smsBalance: balance });

  const phone = await fetch(
    `${API}/${phoneId}?fields=display_phone_number,verified_name&access_token=${token}`
  )
    .then((r) => r.json())
    .catch(() => ({}));
  if (phone?.error) {
    const expired = phone.error.code === 190;
    return NextResponse.json({
      ok: true,
      token: expired ? "expired" : "error",
      detail: expired ? "Token expired — paste a fresh one in Netlify env." : phone.error.message,
      templates: [],
      smsBalance: balance,
    });
  }

  const list = await fetch(
    `${API}/${phoneId}/message_templates?limit=50&access_token=${token}`
  )
    .then((r) => r.json())
    .catch(() => ({}));
  const byName = new Map<string, string>(
    (list?.data ?? []).map((t: { name: string; status: string }) => [t.name, t.status])
  );
  return NextResponse.json({
    ok: true,
    token: "live",
    number: phone?.display_phone_number,
    name: phone?.verified_name,
    templates: WANT.map((n) => ({ name: n, status: byName.get(n) ?? "not-submitted" })),
    smsBalance: balance,
  });
}
