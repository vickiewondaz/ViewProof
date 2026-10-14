// Termii SMS — the channel that works today. WhatsApp stays primary in
// whatsapp.ts; every sender below tries WhatsApp first and falls back here,
// so SMS spend automatically drops to zero when templates approve.

const BASE = "https://v3.api.termii.com";

/** 0803… / +234… / 234… → 234… (Termii wants international, no plus). */
export function toIntl(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("234") && d.length >= 12) return d.slice(0, 13);
  if (d.length === 11 && d.startsWith("0")) return `234${d.slice(1)}`;
  if (d.length === 10) return `234${d}`;
  return d;
}

export async function sendSms(
  to: string,
  text: string
): Promise<{ delivered: boolean; reason?: string }> {
  const key = process.env.TERMII_API_KEY;
  const from = process.env.TERMII_SENDER_ID ?? "ViewProof";
  if (!key) {
    console.log(`[sms] no key, would send to ${to}: ${text.slice(0, 80)}`);
    return { delivered: false, reason: "no-key" };
  }
  try {
    const res = await fetch(`${BASE}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        to: toIntl(to),
        from,
        sms: text,
        type: "plain",
        channel: "dnd", // transactional — bypasses DND restrictions
      }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.message_id) {
      console.warn("[sms] termii refused", res.status, JSON.stringify(j).slice(0, 200));
      return { delivered: false, reason: "send-failed" };
    }
    return { delivered: true };
  } catch (e) {
    console.warn("[sms] failed", (e as Error).message);
    return { delivered: false, reason: "send-failed" };
  }
}

/** Naira balance for the admin health panel. Never throws. */
export async function smsBalance(): Promise<number | null> {
  const key = process.env.TERMII_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}/api/get-balance?api_key=${key}`, {
      signal: AbortSignal.timeout(10000),
    });
    const j = await res.json().catch(() => ({}));
    return typeof j?.balance === "number" ? j.balance : null;
  } catch {
    return null;
  }
}
