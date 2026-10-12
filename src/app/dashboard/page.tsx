"use client";
import { useEffect, useState } from "react";

type Summary = {
  agency?: { name: string; status: string };
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
        <a href="/api/reports/weekly?format=csv" className="rounded-xl glass-soft px-4 py-3 text-[16px] font-semibold">
          Export CSV
        </a>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {s.agency?.status === "Suspended" && (
          <div className="rounded-2xl bg-coral-100 p-4 md:col-span-2 xl:col-span-3">
            <p className="text-[16px] font-bold">🔒 This shop is locked by platform support</p>
            <p className="mt-1 text-[16px]">Your cards are hidden and bookings paused. Records are safe. Talk to support to reopen.</p>
          </div>
        )}
        {(() => {
          const totalAssigned = s.scorecard.reduce((n, a) => n + a.assigned, 0);
          const step =
            s.listings.total === 0
              ? { n: "Step 1 of 3", text: "Add your first place — it takes two minutes.", href: "/dashboard/listings", cta: "Add a place →" }
              : (s.listings.byStatus["Active"] ?? 0) === 0
                ? { n: "Step 2 of 3", text: "Add photos, pick a host, then publish your first card.", href: "/dashboard/listings", cta: "Publish →" }
                : totalAssigned === 0
                  ? { n: "Step 3 of 3", text: "Share a card on WhatsApp — bookings land here by themselves.", href: "/dashboard/listings", cta: "Open listings →" }
                  : null;
          return step ? (
            <div className="rounded-2xl bg-proof-100 p-4 md:col-span-2 xl:col-span-3">
              <p className="text-[14px] font-bold text-proof-600">{step.n}</p>
              <p className="mt-1 text-[18px] font-bold">{step.text}</p>
              <a href={step.href} className="mt-2 inline-block rounded-xl bg-proof-600 px-5 py-3 text-[16px] font-bold text-white">
                {step.cta}
              </a>
            </div>
          ) : null;
        })()}
        <section className="glass rounded-2xl p-4">
          <h2 className="text-base font-semibold">Listings · {s.listings.total}</h2>
          <p className="text-[16px]">
            {Object.entries(s.listings.byStatus).map(([k, v]) => `${k}: ${v}`).join(" · ")}
          </p>
          <a href="/dashboard/listings" className="mt-2 inline-block rounded-xl bg-sand-100 px-4 py-3 text-[16px] font-semibold">
            Manage listings →
          </a>
          {s.listings.staleLive > 0 && (
            <p className="mt-1 rounded-xl bg-coral-100 p-2 text-[16px]">
              ⚠ {s.listings.staleLive} active look stale — reconfirm to unpause booking.
            </p>
          )}
        </section>
        <section className="glass rounded-2xl p-4">
          <h2 className="text-base font-semibold">Today&apos;s viewings</h2>
          <p className="text-[16px]">
            {Object.entries(s.bookingsToday).map(([k, v]) => `${k}: ${v}`).join(" · ") || "No activity yet."}
          </p>
          <a href="/dashboard/bookings" className="glass-soft mt-2 inline-block rounded-xl px-4 py-3 text-[16px] font-semibold">
            Open bookings →
          </a>
        </section>
        <section className="glass rounded-2xl p-4">
          <h2 className="text-base font-semibold">Agent scorecard</h2>
          <div className="mt-2 grid gap-2">
            {s.scorecard.map((a) => (
              <div key={a.id} className="rounded-xl bg-sand-100 px-3 py-2 text-[16px]">
                <span className="font-semibold">{a.name}</span>
                {" · "}{a.attended}/{a.assigned} attended ({a.attendedPct}%)
                {" · "}{a.noShows} no-shows · {a.mismatches} mismatches
                {!a.active && " · inactive"}
              </div>
            ))}
            {!s.scorecard.length && <p className="text-[16px]">No agents yet.</p>}
          </div>
          <a href="/dashboard/team" className="glass-soft mt-3 inline-block rounded-xl px-4 py-3 text-[16px] font-semibold">
            Manage team →
          </a>
        </section>
        <section className="glass rounded-2xl p-4">
          <h2 className="text-base font-semibold">Issues inbox · {s.openIssues} open</h2>
          <a href="/review" className="text-[16px] text-sky-500">Open triage queue →</a>
        </section>
      </div>
    </main>
  );
}
