"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Overview = {
  days: number;
  stats: {
    agencies: number; listings: number; bookings: number; users: number; agents: number;
    attended: number; noShows: number; closed: number; volume: number; currency: string; openIssues: number;
  };
  audit: { at: string; actor: string; entity: string; action: string; ref: string }[];
};

// Superadmin command center: whole platform, one screen. Numbers first,
// audit trail below, action screens one tap away. Read-only by design.
export default function SuperAdminPage() {
  const [o, setO] = useState<Overview | null>(null);
  const [days, setDays] = useState<7 | 30>(7);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/overview?days=${days}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) { setO(j); setMsg(""); }
        else setMsg("Superadmin only — this page needs a platform admin sign-in.");
      })
      .catch(() => setMsg("Couldn't load."));
  }, [days]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Platform</p>
          <h1 className="font-display text-[32px] font-bold">Superadmin</h1>
        </div>
        <div className="flex gap-2">
          <Button variant={days === 7 ? "default" : "secondary"} size="sm" onClick={() => setDays(7)}>7 days</Button>
          <Button variant={days === 30 ? "default" : "secondary"} size="sm" onClick={() => setDays(30)}>30 days</Button>
        </div>
      </div>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}

      {o && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Agencies" value={String(o.stats.agencies)} />
            <Stat label="Listings" value={String(o.stats.listings)} />
            <Stat label={`Bookings · ${o.days}d`} value={String(o.stats.bookings)} />
            <Stat label="People · hosts" value={`${o.stats.users} · ${o.stats.agents}`} />
            <Stat label="Attended" value={String(o.stats.attended)} good />
            <Stat label="No-shows" value={String(o.stats.noShows)} bad={o.stats.noShows > 0} />
            <Stat label="Deals closed" value={String(o.stats.closed)} good />
            <Stat label="Closed volume" value={`${o.stats.currency} ${Math.round(o.stats.volume).toLocaleString()}`} />
          </div>

          {o.stats.openIssues > 0 && (
            <div className="mt-3 rounded-2xl bg-coral-100 p-4 text-[16px]">
              <span className="font-bold">⚠ {o.stats.openIssues} unresolved reports.</span>{" "}
              <a href="/review" className="font-bold underline">Open triage →</a>
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button asChild variant="secondary"><a href="/admin">Landlord office →</a></Button>
            <Button asChild variant="secondary"><a href="/review">Triage queue →</a></Button>
            <Button asChild variant="secondary"><a href="/dashboard">Owner view →</a></Button>
          </div>

          <section className="glass mt-4 p-5" aria-label="Audit trail">
            <p className="eyebrow">Audit trail · latest 30</p>
            <ul className="tabular mt-2 grid gap-1 text-[14px]">
              {o.audit.map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-2 border-b border-line py-1.5 last:border-0">
                  <span className="text-clay">{new Date(a.at).toLocaleString()}</span>
                  <span className="font-bold">{a.action}</span>
                  <span>{a.entity}…{a.ref}</span>
                  <span className="text-clay">by {a.actor}</span>
                </li>
              ))}
              {!o.audit.length && <li className="text-clay">Nothing recorded yet.</li>}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="glass p-4">
      <p className="eyebrow !text-[11px]">{label}</p>
      <p className={`font-display tabular mt-1 text-[26px] font-bold leading-none ${good ? "text-pine-900" : bad ? "text-coral-500" : ""}`}>
        {value}
      </p>
    </div>
  );
}
