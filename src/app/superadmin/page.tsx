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

type Person = { id: string; email: string; name: string; role: string | null; banned: boolean | null };

// Superadmin command center: whole platform, one screen. Numbers first,
// audit trail below, action screens one tap away. Read-only by design.
export default function SuperAdminPage() {
  const [o, setO] = useState<Overview | null>(null);
  const [days, setDays] = useState<7 | 30>(7);
  const [msg, setMsg] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [lookup, setLookup] = useState("");

  useEffect(() => {
    fetch(`/api/admin/overview?days=${days}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) { setO(j); setMsg(""); }
        else setMsg("Creator only — this page needs the superadmin sign-in.");
      })
      .catch(() => setMsg("Couldn't load."));
    fetch("/api/admin/admins")
      .then((r) => r.json())
      .then((j) => { if (j.ok) setPeople(j.people); })
      .catch(() => null);
  }, [days]);

  const find = async () => {
    if (!lookup.includes("@")) return setMsg("Type an account email first.");
    const r = await fetch(`/api/admin/admins?email=${encodeURIComponent(lookup.trim())}`).then((x) => x.json()).catch(() => ({}));
    if (r.ok && r.people.length) { setPeople(r.people); setMsg(""); }
    else setMsg("No account with that email yet — they sign up first, then you grant.");
  };

  const setRole = async (id: string, role: "owner" | "admin") => {
    const r = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, role }),
    }).then((x) => x.json()).catch(() => ({}));
    setMsg(r.ok ? `${r.email} is now ${r.role}.` : r.error ?? "Failed.");
    if (r.ok) {
      const l = await fetch("/api/admin/admins").then((x) => x.json()).catch(() => ({}));
      if (l.ok) setPeople(l.people);
    }
  };

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

          {/* No operator jump-links: the creator governs, landlords operate. */}

          <section className="glass mt-4 p-5" aria-label="Landlords">
            <p className="eyebrow">Who runs shops</p>
            <h2 className="font-display text-[22px] font-bold">Landlords — grant or revoke</h2>
            <p className="mt-1 text-[14px] text-clay">You decide who is landlord. Nobody here can touch the creator role — that lives outside the app.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="account@email.com"
                inputMode="email"
                aria-label="Look up account by email"
                className="glass-soft glass-input min-h-[48px] w-full rounded-xl px-4 text-[16px]"
              />
              <Button onClick={find} variant="secondary" className="shrink-0">Find</Button>
            </div>
            <ul className="mt-3 grid gap-2">
              {people.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-3">
                  <div>
                    <p className="text-[16px] font-bold">{p.name || p.email}</p>
                    <p className="tabular text-[14px] text-clay">{p.email} · {p.role ?? "seeker"}{p.banned ? " · locked" : ""}</p>
                  </div>
                  {p.role === "superadmin" ? (
                    <span className="rounded-full bg-pine-900 px-3 py-1 text-[14px] font-bold text-brass-100">creator</span>
                  ) : (
                    <div className="flex gap-2">
                      {p.role !== "admin" && <Button size="sm" onClick={() => setRole(p.id, "admin")}>Make landlord</Button>}
                      {p.role === "admin" && <Button size="sm" variant="secondary" onClick={() => setRole(p.id, "owner")}>Remove</Button>}
                    </div>
                  )}
                </li>
              ))}
              {!people.length && <li className="text-[16px] text-clay">No landlords yet — look up an account above to grant one.</li>}
            </ul>
          </section>

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
