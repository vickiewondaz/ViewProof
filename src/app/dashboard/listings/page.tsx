"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Listing = {
  id: string; title: string; area: string; price: string; currency: string;
  status: string; slug: string; lastConfirmedAt: string;
  agent?: { publicName: string; fullName: string } | null;
};
type Agent = { id: string; fullName: string; publicName: string; active: boolean };

const STATUS_HINT: Record<string, string> = {
  Draft: "Not visible yet — finish details, then publish.",
  Active: "Live and bookable 🎉",
  NeedsReview: "Needs your eyes — something was flagged.",
  StalePaused: "Paused — buyers can't book until you reconfirm.",
  Unavailable: "Hidden for now.",
  Archived: "Filed away.",
};

// Owner's inventory desk: see everything, add new, keep fresh with 1 tap.
export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ title: "", type: "rent", area: "", price: "", agentId: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [l, a] = await Promise.all([
      fetch("/api/listings").then((r) => r.json()).catch(() => ({})),
      fetch("/api/agents").then((r) => r.json()).catch(() => ({})),
    ]);
    if (l.ok) setListings(l.listings);
    else setMsg("Sign in as owner to manage listings.");
    if (a.ok) setAgents(a.agents.filter((x: Agent) => x.active));
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (f.title.trim().length < 3) return setMsg("Give the listing a clear title first.");
    if (f.area.trim().length < 2) return setMsg("Which area is it in?");
    if (!Number(f.price) || Number(f.price) <= 0) return setMsg("Add the price so buyers know.");
    setBusy(true);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.title.trim(), type: f.type, area: f.area.trim(),
        price: Number(f.price), agentId: f.agentId || undefined, status: "Draft",
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) {
      setF({ title: "", type: "rent", area: "", price: "", agentId: "" });
      setShowForm(false);
      setMsg("Saved as draft — add photos, then publish from the card.");
      load();
    } else setMsg(j.error ?? "Couldn't save — try again.");
  };

  const reconfirm = async (id: string) => {
    const res = await fetch(`/api/listings/${id}/reconfirm`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? `Fresh again ✓ Status: ${j.listing.status}.` : j.error ?? "Failed.");
    if (j.ok) load();
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-bold md:text-[32px]">Your listings</h1>
          <p className="mt-1 text-[16px]">Fresh cards get bookings. Stale ones pause themselves.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-proof-600 px-4 py-3 text-[16px] font-bold text-white"
        >
          {showForm ? "Close" : "+ Add a place"}
        </button>
      </div>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}

      {showForm && (
        <section className="mt-4 rounded-2xl bg-white p-4 md:p-6">
          <h2 className="text-[18px] font-bold">New listing (starts as draft)</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[16px] font-semibold" htmlFor="nl-title">Title</label>
              <input id="nl-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. 3-bedroom apartment" className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-[16px]" />
            </div>
            <div>
              <label className="block text-[16px] font-semibold" htmlFor="nl-type">Type</label>
              <select id="nl-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-[16px]">
                <option value="rent">Rent</option>
                <option value="sale">Sale</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[16px] font-semibold" htmlFor="nl-area">Area</label>
              <input id="nl-area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="e.g. Gwarinpa, Abuja" className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-[16px]" />
            </div>
            <div>
              <label className="block text-[16px] font-semibold" htmlFor="nl-price">Price (₦)</label>
              <input id="nl-price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 4000000" inputMode="numeric" className="tabular mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-[16px]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[16px] font-semibold" htmlFor="nl-agent">Who hosts viewings?</label>
              <select id="nl-agent" value={f.agentId} onChange={(e) => setF({ ...f, agentId: e.target.value })} className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-[16px]">
                <option value="">Choose later</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.publicName} ({a.fullName})</option>)}
              </select>
            </div>
          </div>
          <button onClick={create} disabled={busy} className="mt-4 w-full rounded-xl bg-proof-600 px-4 py-4 text-[18px] font-bold text-white disabled:opacity-60 md:w-auto md:px-8">
            {busy ? "Saving…" : "Save draft"}
          </button>
        </section>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((l) => (
          <article key={l.id} className="rounded-2xl bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[18px] font-bold leading-snug">{l.title}</p>
                <p className="text-[16px]">{l.area}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-1 text-[14px] font-bold ${l.status === "Active" ? "bg-proof-100" : l.status === "StalePaused" || l.status === "NeedsReview" ? "bg-coral-100" : "bg-sand-100"}`}>
                {l.status}
              </span>
            </div>
            <p className="tabular mt-1 text-[16px] font-semibold">{l.currency} {Number(l.price).toLocaleString()}</p>
            <p className="mt-1 text-[14px] text-slate-500">
              Confirmed {new Date(l.lastConfirmedAt).toDateString()}
              {l.agent ? ` · ${l.agent.publicName}` : " · no host yet"}
            </p>
            <p className="mt-1 text-[14px]">{STATUS_HINT[l.status] ?? ""}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(l.status === "StalePaused" || l.status === "Active" || l.status === "NeedsReview") && (
                <button onClick={() => reconfirm(l.id)} className="min-h-[48px] rounded-xl bg-proof-600 px-2 py-2 text-[16px] font-bold text-white">
                  Reconfirm ✓
                </button>
              )}
              {l.status === "Active" && (
                <Link href={`/c/${l.slug}`} className="flex min-h-[48px] items-center justify-center rounded-xl bg-sand-100 px-2 py-2 text-[16px] font-semibold">
                  View card →
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
      {!listings.length && (
        <p className="mt-6 text-center text-[16px]">No listings yet — tap “+ Add a place” to start. Your first 5 cards are free.</p>
      )}
    </main>
  );
}
