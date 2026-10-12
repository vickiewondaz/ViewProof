"use client";
import { useEffect, useState } from "react";

type Agent = { id: string; fullName: string; publicName: string; phone: string; active: boolean };

// Owner's team desk: who's on the roster, who hosts what, invite flow.
export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [msg, setMsg] = useState("");
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
      <h1 className="text-[26px] font-bold md:text-[32px]">Your team</h1>
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
        <button onClick={add} disabled={busy} className="mt-4 w-full rounded-xl bg-proof-600 px-4 py-4 text-[18px] font-bold text-white disabled:opacity-60 md:w-auto md:px-8">
          {busy ? "Adding…" : "Add host"}
        </button>
      </section>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-4">
            <p className="text-[18px] font-bold">{a.publicName} <span className="font-normal text-slate-500">({a.fullName})</span></p>
            <p className="tabular mt-1 text-[16px]">{a.phone}</p>
            <p className="mt-1 text-[14px]">{a.active ? "Active ✓" : "Inactive"}</p>
          </div>
        ))}
      </div>
      {!loaded && <p className="mt-6 text-center text-[16px]">Gathering the team…</p>}
      {loaded && !agents.length && <p className="mt-6 text-center text-[16px]">Nobody yet — add your first host above.</p>}
    </main>
  );
}
