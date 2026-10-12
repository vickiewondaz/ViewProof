"use client";
import { useEffect, useState } from "react";

type Summary = {
  listings: { total: number; byStatus: Record<string, number>; staleLive: number };
  bookingsToday: Record<string, number>;
  scorecard: { id: string; name: string; active: boolean; assigned: number; attended: number; noShows: number; mismatches: number; attendedPct: number }[];
  openIssues: number;
};

export default function DashboardPage() {
  const [s, setS] = useState<Summary | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/reports/summary")
      .then((r) => r.json())
      .then((j) => (j.ok ? setS(j.summary) : setMsg("Sign in as owner/agent to view.")))
      .catch(() => setMsg("Failed to load."));
  }, []);

  if (msg) return <main className="mx-auto w-full max-w-6xl px-4 py-6"><p className="text-[16px]">{msg}</p></main>;
  if (!s) return <main className="mx-auto w-full max-w-6xl px-4 py-6"><p className="text-[16px]">Loading your numbers…</p></main>;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[26px] font-bold md:text-[32px]">Owner dashboard</h1>
        <a href="/api/reports/weekly?format=csv" className="rounded-xl bg-white px-4 py-3 text-[16px] font-semibold">
          Export CSV
        </a>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl bg-white p-4">
          <h2 className="text-base font-semibold">Listings · {s.listings.total}</h2>
          <p className="text-sm">
            {Object.entries(s.listings.byStatus).map(([k, v]) => `${k}: ${v}`).join(" · ")}
          </p>
          {s.listings.staleLive > 0 && (
            <p className="mt-1 rounded-xl bg-coral-100 p-2 text-sm">
              ⚠ {s.listings.staleLive} active look stale — reconfirm to unpause booking.
            </p>
          )}
        </section>
        <section className="rounded-2xl bg-white p-4">
          <h2 className="text-base font-semibold">Today&apos;s viewings</h2>
          <p className="text-sm">
            {Object.entries(s.bookingsToday).map(([k, v]) => `${k}: ${v}`).join(" · ") || "No activity yet."}
          </p>
        </section>
        <section className="rounded-2xl bg-white p-4">
          <h2 className="text-base font-semibold">Agent scorecard</h2>
          <div className="mt-2 grid gap-2">
            {s.scorecard.map((a) => (
              <div key={a.id} className="rounded-xl bg-sand-100 px-3 py-2 text-sm">
                <span className="font-semibold">{a.name}</span>
                {" · "}{a.attended}/{a.assigned} attended ({a.attendedPct}%)
                {" · "}{a.noShows} no-shows · {a.mismatches} mismatches
                {!a.active && " · inactive"}
              </div>
            ))}
            {!s.scorecard.length && <p className="text-sm">No agents yet.</p>}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-4">
          <h2 className="text-base font-semibold">Issues inbox · {s.openIssues} open</h2>
          <a href="/review" className="text-sm text-sky-500">Open triage queue →</a>
        </section>
      </div>
    </main>
  );
}
