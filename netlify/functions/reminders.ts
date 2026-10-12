import { schedule } from "@netlify/functions";

// Heartbeat: hourly, deliver 24h + 2h WhatsApp reminders (deduped in-app).
async function run() {
  const base = process.env.SITE_URL ?? process.env.URL ?? "https://viewproof.netlify.app";
  const res = await fetch(`${base}/api/jobs/reminders`, {
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  console.log("[cron reminders]", res.status, (await res.text()).slice(0, 300));
  return { statusCode: res.ok ? 200 : 500 };
}

export const handler = schedule("0 * * * *", run);
