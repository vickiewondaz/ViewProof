"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Agent = { id: string; fullName: string; publicName: string; phone: string; active: boolean };

// Owner's team desk: who's on the roster, who hosts what, invite flow.
export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [msg, setMsg] = useState("");
  const [relay, setRelay] = useState<Record<string, { code: string; name: string; expiresAt: string } | { error: string }>>({});
  const [f, setF] = useState({ fullName: "", publicName: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const r = await fetch("/api/agents").then((x) => x.json()).catch(() => ({}));
    if (r.ok) setAgents(r.agents);
    else setMsg("Sign in as owner to manage the team.");
    setLoaded(true);
  };
  useEffect(() => {
    load();
  }, []);

  // Pre-WhatsApp-approval: read the agent's pending login code aloud/by SMS.
  // Every read is audited server-side; codes expire in minutes.
  const readCode = async (a: Agent) => {
    const r = await fetch(`/api/agents/pending-code?phone=${encodeURIComponent(a.phone)}`).then((x) => x.json()).catch(() => ({}));
    if (r.ok) setRelay((m) => ({ ...m, [a.id]: { code: r.code, name: r.name, expiresAt: r.expiresAt } }));
    else setRelay((m) => ({ ...m, [a.id]: { error: r.error ?? "Couldn't read a code." } }));
  };

  const add = async () => {
    if (f.fullName.trim().length < 2) return setMsg("What is their full name?");
    if (f.phone.trim().length < 7) return setMsg("Add their WhatsApp number — it must match the number they sign in with.");
    setBusy(true);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: f.fullName.trim(), publicName: f.publicName.trim() || undefined, phone: f.phone.trim() }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) {
      setF({ fullName: "", publicName: "", phone: "" });
      setMsg("Added ✓ Tell them to sign in on the agent page and tap “Link my agent spot”.");
      load();
    } else setMsg(j.error ?? "Couldn't add.");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <a href="/dashboard" className="inline-block min-h-[44px] py-2 text-[16px] font-semibold text-sky-500">← Dashboard</a>
      <h1 className="font-display text-[32px] font-bold md:text-[32px]">Your team</h1>
      <p className="mt-1 max-w-2xl text-[16px]">
        Use the exact WhatsApp number they sign in with.
      </p>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}

      <section className="glass mt-4 rounded-2xl p-4 md:p-6">
        <h2 className="text-[18px] font-bold">Add a host</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-[16px] font-semibold" htmlFor="tm-name">Full name</label>
            <input id="tm-name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="e.g. Emeka Obi" autoComplete="off" className="glass-soft glass-input mt-1 min-h-[48px] w-full rounded-xl px-4 text-[16px]" />
          </div>
          <div>
            <label className="block text-[16px] font-semibold" htmlFor="tm-public">Public name <span className="font-normal">(buyers see this)</span></label>
            <input id="tm-public" value={f.publicName} onChange={(e) => setF({ ...f, publicName: e.target.value })} placeholder="e.g. Emeka" autoComplete="off" className="glass-soft glass-input mt-1 min-h-[48px] w-full rounded-xl px-4 text-[16px]" />
          </div>
          <div>
            <label className="block text-[16px] font-semibold" htmlFor="tm-phone">WhatsApp number</label>
            <input id="tm-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+234 800 000 0000" inputMode="tel" autoComplete="off" className="glass-soft glass-input mt-1 min-h-[48px] w-full rounded-xl px-4 text-[16px]" />
          </div>
        </div>
        <Button onClick={add} disabled={busy} size="lg" className="mt-4 w-full md:w-auto">
          {busy ? "Adding…" : "Add host"}
        </Button>
      </section>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-4">
            <p className="text-[18px] font-bold">{a.publicName} <span className="font-normal text-clay">({a.fullName})</span></p>
            <p className="tabular mt-1 text-[16px]">{a.phone}</p>
            <p className="mt-1 text-[14px]">{a.active ? "Active ✓" : "Inactive"}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => readCode(a)}>
              Read login code
            </Button>
            {relay[a.id] && "code" in relay[a.id] && (
              <p className="tabular mt-2 text-[16px]" role="status">
                { (relay[a.id] as { name: string }).name }’s code:{" "}
                <strong className="text-[20px] tracking-[0.25em]">{ (relay[a.id] as { code: string }).code }</strong>
                <br />
                <span className="text-[14px] text-clay">
                  Expires {new Date((relay[a.id] as { expiresAt: string }).expiresAt).toLocaleTimeString()} — read it to them now, don’t screenshot it around.
                </span>
              </p>
            )}
            {relay[a.id] && "error" in relay[a.id] && (
              <p className="mt-2 text-[16px]" role="status">{ (relay[a.id] as { error: string }).error }</p>
            )}
          </div>
        ))}
      </div>
      {!loaded && <p className="mt-6 text-center text-[16px]">Gathering the team…</p>}
      {loaded && !agents.length && <p className="mt-6 text-center text-[16px]">Nobody yet — add your first host above.</p>}
    </main>
  );
}
