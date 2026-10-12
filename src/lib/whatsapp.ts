// WhatsApp Cloud API (free tier) — transactional utility templates only.
// PRD §7.11 + Design System §9. Never marketing copy.

const API_VERSION = "v21.0";

export const TEMPLATES = {
  booking_confirm: "booking_confirm",
  reminder_24h: "reminder_24h",
  reminder_2h: "reminder_2h",
  agent_alert: "agent_alert",
  refresh_nudge: "refresh_nudge",
  receipt: "receipt",
} as const;

type SendArgs = {
  to: string;
  template: keyof typeof TEMPLATES;
  components?: unknown[];
};

export async function sendWhatsApp({ to, template, components }: SendArgs) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.warn("[whatsapp] missing WHATSAPP_TOKEN/PHONE_NUMBER_ID, skipping send");
    return { skipped: true };
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
          components: components ?? [],
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${text}`);
  }
  return res.json();
}
