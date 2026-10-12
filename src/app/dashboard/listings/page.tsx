"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Listing = {
  id: string; title: string; area: string; price: string; currency: string;
  status: string; slug: string; lastConfirmedAt: string;
  agent?: { publicName: string; fullName: string } | null;
};
type Agent = { id: string; fullName: string; publicName: string; active: boolean };
type Slot = { id: string; startsAt: string; capacity: number; bookedCount: number };

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
  const [openSlots, setOpenSlots] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<string, Slot[]>>({});
  const [newSlot, setNewSlot] = useState("");

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

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/listings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const j = await res.json().catch(() => ({}));
    // Gate errors are human already ("Missing for Active: ...") — show them raw.
    setMsg(j.ok ? `Now ${j.listing.status}.` : j.error ?? "Couldn't change — try again.");
    if (j.ok) load();
  };

  const toggleSlots = async (id: string) => {
    if (openSlots === id) return setOpenSlots(null);
    setOpenSlots(id);
    const res = await fetch(`/api/slots?listingId=${id}`).then((r) => r.json()).catch(() => ({}));
    if (res.ok) setSlots((s) => ({ ...s, [id]: res.slots }));
  };

  const addSlot = async (listingId: string) => {
    if (!newSlot) return setMsg("Pick a date and time first.");
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, startsAt: new Date(newSlot).toISOString(), capacity: 2 }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      setNewSlot("");
      setMsg("Time added ✓ Buyers can book it now.");
      const r = await fetch(`/api/slots?listingId=${listingId}`).then((x) => x.json()).catch(() => ({}));
      if (r.ok) setSlots((s) => ({ ...s, [listingId]: r.slots }));
    } else setMsg(j.error ?? "Couldn't add — try again.");
  };

  const dropSlot = async (listingId: string, slotId: string) => {
    const res = await fetch(`/api/slots/${slotId}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      setMsg("Time removed.");
      const r = await fetch(`/api/slots?listingId=${listingId}`).then((x) => x.json()).catch(() => ({}));
      if (r.ok) setSlots((s) => ({ ...s, [listingId]: r.slots }));
    } else setMsg(j.error ?? "Couldn't remove.");
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
              {(l.status === "Draft" || l.status === "NeedsReview" || l.status === "Unavailable") && (
                <button onClick={() => setStatus(l.id, "Active")} className="min-h-[48px] rounded-xl bg-proof-600 px-2 py-2 text-[16px] font-bold text-white">
                  Publish 🚀
                </button>
              )}
              {l.status === "Active" && (
                <>
                  <Link href={`/c/${l.slug}`} className="flex min-h-[48px] items-center justify-center rounded-xl bg-sand-100 px-2 py-2 text-[16px] font-semibold">
                    View card →
                  </Link>
                  <button onClick={() => setStatus(l.id, "Unavailable")} className="min-h-[48px] rounded-xl bg-white px-2 py-2 text-[16px] font-semibold">
                    Pause
                  </button>
                </>
              )}
              <button onClick={() => toggleSlots(l.id)} className="col-span-2 min-h-[48px] rounded-xl bg-white px-2 py-2 text-[16px] font-semibold">
                {openSlots === l.id ? "Hide times ▴" : "Viewing times ▾"}
              </button>
            </div>
            {openSlots === l.id && (
              <div className="mt-2 rounded-xl bg-sand-100 p-3">
                {(slots[l.id] ?? []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 border-b border-white py-2 text-[16px] last:border-0">
                    <span>{new Date(s.startsAt).toLocaleString()} · {s.bookedCount}/{s.capacity} taken</span>
                    <button onClick={() => dropSlot(l.id, s.id)} aria-label="Remove time" className="min-h-[44px] min-w-[44px] rounded-lg bg-white px-3 font-bold">×</button>
                  </div>
                ))}
                {!(slots[l.id] ?? []).length && <p className="py-2 text-[16px]">No times yet — add the first below.</p>}
                <div className="mt-2 flex gap-2">
                  <input
                    type="datetime-local"
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value)}
                    aria-label="New viewing time"
                    className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px]"
                  />
                  <button onClick={() => addSlot(l.id)} className="min-h-[48px] shrink-0 rounded-xl bg-proof-600 px-4 text-[16px] font-bold text-white">
                    Add
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      {!listings.length && (
        <p className="mt-6 text-center text-[16px]">No listings yet — tap “+ Add a place” to start. Your first 5 cards are free.</p>
      )}
    </main>
  );
}
