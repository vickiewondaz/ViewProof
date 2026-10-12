// WhatsApp Cloud API (free tier) — transactional utility templates only.
// PRD §7.11 + Design System §9. Never marketing copy.
//
// SUBMIT THESE BODIES VERBATIM in Meta (Utility category, language en).
// Positional {{1}}.. params must match the senders below exactly.

const API_VERSION = "v21.0";

export const TEMPLATES = {
  booking_confirm: "booking_confirm",
  reminder_24h: "reminder_24h",
  reminder_2h: "reminder_2h",
  agent_alert: "agent_alert",
  refresh_nudge: "refresh_nudge",
  receipt: "receipt",
  weekly_summary: "weekly_summary",
  deal_closed: "deal_closed",
} as const;

/** Exact approved bodies. Keep in sync with Meta template submissions. */
export const TEMPLATE_COPIES: Record<keyof typeof TEMPLATES, string> = {
  booking_confirm:
    "Hello {{1}}, your viewing for {{2}} on {{3}} is {{4}}. Your host: {{5}} ({{6}}). Your meeting code: {{7}}. Reply CANCEL to cancel. ViewProof does not verify title or ownership.",
  reminder_24h:
    "Reminder: your viewing for {{1}} is {{2}} with {{3}} ({{4}}). Your meeting code is in your earlier WhatsApp message. Reply CANCEL to cancel.",
  reminder_2h:
    "Soon: your viewing for {{1}} is {{2}} with {{3}} ({{4}}). Please be on time. Reply CANCEL to cancel.",
  agent_alert:
    "New viewing request {{1}}: {{2}} ({{3}}) for {{4}} at {{5}}. Confirm here: {{6}}",
  refresh_nudge:
    "Hello {{1}}: {{2}} listing(s) paused as stale. Tap to reconfirm and reopen booking: {{3}}",
  receipt:
    "Done! You viewed {{1}} on {{2}} with {{3}}. Anything mismatched? Report here: {{4}}",
  weekly_summary:
    "ViewProof weekly for {{1}}: {{2}} viewing(s) completed, {{3}} upcoming. {{4}} live listings, {{5}} paused as stale. {{6}} Full report: {{7}}",
  deal_closed:
    "Good news {{1}}! Your deal for {{2}} closed at {{3}} with {{4}}. The record is kept. ViewProof does not handle payments.",
};

export function siteUrl(): string {
  return (
    process.env.SITE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

function bodyParams(params: string[]) {
  return [
    {
      type: "body",
      parameters: params.map((text) => ({ type: "text", text })),
    },
  ];
}

type SendArgs = {
  to: string;
  template: keyof typeof TEMPLATES;
  params: string[];
};

export async function sendWhatsApp({ to, template, params }: SendArgs) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.warn("[whatsapp] missing WHATSAPP_TOKEN/PHONE_NUMBER_ID, skipping send");
    return { skipped: true as const };
  }
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: TEMPLATES[template],
          language: { code: "en" },
          components: bodyParams(params),
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ messages?: { id: string }[] }>;
}

// Authentication-category template for agent login codes (Better Auth phoneNumber).
// Create in Meta as Authentication type with code delivery setup; the code goes
// in the body {{1}}. Name configurable via WHATSAPP_AUTH_TEMPLATE.
export async function sendAuthCode(to: string, code: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.PHONE_NUMBER_ID;
  const name = process.env.WHATSAPP_AUTH_TEMPLATE ?? "agent_login_code";
  if (!token || !phoneId) {
    console.warn("[whatsapp] missing credentials, skipping auth code");
    return { skipped: true as const };
  }
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name,
          language: { code: "en" },
          components: bodyParams([code]),
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp auth-code send failed: ${res.status} ${text}`);
  }
  return res.json();
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
