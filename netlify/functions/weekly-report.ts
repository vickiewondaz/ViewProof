import { schedule } from "@netlify/functions";

// Heartbeat: Mondays 07:00 UTC (08:00 Lagos), owner weekly summaries
// via WhatsApp + email. The report owners open is the report that renews.
async function run() {
  const base = process.env.SITE_URL ?? process.env.URL ?? "https://viewproof.netlify.app";
  const res = await fetch(`${base}/api/jobs/weekly-report`, {
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  console.log("[cron weekly-report]", res.status, (await res.text()).slice(0, 300));
  return { statusCode: res.ok ? 200 : 500 };
}

export const handler = schedule("0 7 * * 1", run);
