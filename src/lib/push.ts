import webpush from "web-push";
import { prisma } from "./db";

let configured = false;
function setup() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv || pub === "change-me") return false;
  webpush.setVapidDetails("mailto:hello@viewproof.app", pub, priv);
  configured = true;
  return true;
}

// Notify agency devices (booking alerts alongside WhatsApp, never instead).
// Failures are per-device and never break the booking flow.
export async function notifyAgency(agencyId: string, body: string) {
  if (!setup()) return { delivered: 0 };
  const subs = await prisma.pushSub.findMany({ where: { agencyId } });
  let delivered = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } },
          JSON.stringify({ title: "ViewProof", body })
        );
        delivered++;
      } catch {
        // 410 Gone → stale subscription; prune it.
        await prisma.pushSub.delete({ where: { endpoint: s.endpoint } }).catch(() => null);
      }
    })
  );
  return { delivered };
}
