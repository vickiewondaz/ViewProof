import { schedule } from "@netlify/functions";

// Heartbeat: every 6h, pause stale listings + nudge owners to reconfirm.
// Calls the app's own endpoint so all logic + audit stay in one place.
async function run() {
  const base = process.env.SITE_URL ?? process.env.URL ?? "https://viewproof.netlify.app";
  const res = await fetch(`${base}/api/jobs/stale-sweep`, {
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  console.log("[cron stale-sweep]", res.status, (await res.text()).slice(0, 300));
  return { statusCode: res.ok ? 200 : 500 };
}

export const handler = schedule("0 */6 * * *", run);
