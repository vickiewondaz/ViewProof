"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import { uploadPhoto } from "@/lib/upload-client";

type Listing = {
  id: string; title: string; area: string; price: string; currency: string;
  status: string; slug: string; lastConfirmedAt: string;
  imageUrls: string[]; photographedAt: string | null; agentId: string | null;
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
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState("");
  const [f, setF] = useState({ title: "", type: "rent", area: "", price: "", agentId: "" });
  const [busy, setBusy] = useState(false);
  const [openSlots, setOpenSlots] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<string, Slot[]>>({});
  const [newSlot, setNewSlot] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [ef, setEf] = useState({ price: "", agentId: "", photographedAt: "", photos: [] as string[] });
  const [uploading, setUploading] = useState(false);

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

  const importCsv = async (text: string) => {
    if (!text.trim()) return setMsg("Paste your spreadsheet first — or pick a .csv file below.");
    setBusy(true);
    const res = await fetch("/api/listings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) {
      const bad = (j.errors ?? []).map((e: { row: number; error: string }) => `row ${e.row}: ${e.error}`).join("; ");
      setMsg(`${j.created.length} draft(s) added ✓${bad ? ` Skipped — ${bad}.` : " Add photos, then publish."}`);
      setCsv("");
      setShowImport(false);
      load();
    } else setMsg(j.error ?? "Couldn't import.");
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

  const startEdit = (l: Listing) => {
    setEditing(l.id);
    setEf({
      price: String(Math.round(Number(l.price))),
      agentId: l.agentId ?? "",
      photographedAt: l.photographedAt ? l.photographedAt.slice(0, 10) : "",
      photos: l.imageUrls ?? [],
    });
    setMsg("");
  };

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    setMsg("Shrinking photo…");
    try {
      const url = await uploadPhoto(f, "listings");
      setEf((e) => ({ ...e, photos: [...e.photos, url] }));
      setMsg("Photo added ✓ Remember to save below.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Photo failed — try again.");
    }
    setUploading(false);
  };

  const saveEdit = async (id: string) => {
    if (!Number(ef.price) || Number(ef.price) <= 0) return setMsg("Price must be above zero.");
    const res = await fetch(`/api/listings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: Number(ef.price),
        agentId: ef.agentId || undefined,
        photographedAt: ef.photographedAt || undefined,
        imageUrls: ef.photos,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      setEditing(null);
      setMsg("Saved ✓ — publish when the details look right.");
      load();
    } else setMsg(j.error ?? "Couldn't save.");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-bold md:text-[32px]">Your listings</h1>
          <p className="mt-1 text-[16px]">Fresh cards get bookings. Stale ones pause themselves.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-proof-600 px-4 py-3 text-[16px] font-bold text-white"
          >
            {showForm ? "Close" : "+ Add a place"}
          </button>
          <button
            onClick={() => setShowImport((v) => !v)}
            className="glass-soft rounded-xl px-4 py-3 text-[16px] font-semibold"
          >
            {showImport ? "Close" : "Import CSV"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}

      {showImport && (
        <section className="glass mt-4 rounded-2xl p-4 md:p-6">
          <h2 className="text-[18px] font-bold">Bring your spreadsheet</h2>
          <p className="mt-1 text-[16px]">
            Columns: title, type (rent/sale/land/commercial/other), area, price, currency, agentPhone, imageUrl, photographedAt.
            Everything lands as draft — nothing goes live until you add photos and publish.
          </p>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={"title,type,area,price\nSunny 2-bed,rent,Lekki,3500000"}
            rows={5}
            className="glass-soft glass-input mt-3 w-full rounded-xl px-4 py-3 font-mono text-[14px]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="glass-soft cursor-pointer rounded-xl px-4 py-3 text-[16px] font-semibold">
              Choose .csv file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) file.text().then((t) => setCsv(t)).catch(() => setMsg("Couldn't read that file."));
                }}
              />
            </label>
            <button onClick={() => importCsv(csv)} disabled={busy} className="rounded-xl bg-proof-600 px-6 py-3 text-[16px] font-bold text-white disabled:opacity-60">
              {busy ? "Importing…" : "Import as drafts"}
            </button>
          </div>
        </section>
      )}

      {showForm && (
        <section className="mt-4 glass rounded-2xl p-4 md:p-6">
          <h2 className="text-[18px] font-bold">New listing (starts as draft)</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[16px] font-semibold" htmlFor="nl-title">Title</label>
              <input id="nl-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. 3-bedroom apartment" className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-[16px]" />
            </div>
            <div>
              <label className="block text-[16px] font-semibold" htmlFor="nl-type">Type</label>
              <select id="nl-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]">
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
              <select id="nl-agent" value={f.agentId} onChange={(e) => setF({ ...f, agentId: e.target.value })} className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]">
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
          <article key={l.id} className="glass rounded-2xl p-4">
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
              <button onClick={() => (editing === l.id ? setEditing(null) : startEdit(l))} className="glass-soft col-span-2 min-h-[48px] rounded-xl px-2 py-2 text-[16px] font-semibold">
                {editing === l.id ? "Close edit ▴" : "Edit details ▾"}
              </button>
            </div>
            {editing === l.id && (
              <div className="mt-2 rounded-xl bg-sand-100 p-3">
                <p className="text-[16px] font-bold">Photos <span className="font-normal">(needed to publish)</span></p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {ef.photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div key={p} className="relative">
                      <img src={p} alt="Listing photo" className="h-20 w-full rounded-lg object-cover" />
                      <button onClick={() => setEf((e) => ({ ...e, photos: e.photos.filter((x) => x !== p) }))} aria-label="Remove photo" className="absolute right-1 top-1 min-h-[36px] min-w-[36px] rounded-lg bg-white/90 font-bold">×</button>
                    </div>
                  ))}
                </div>
                <label className="mt-2 block rounded-xl border-2 border-dashed border-slate-200 px-4 py-4 text-center text-[16px] font-semibold">
                  {uploading ? "Shrinking…" : "+ Add photo (camera)"}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[16px] font-semibold">Photo taken on</label>
                    <input type="date" value={ef.photographedAt} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setEf({ ...ef, photographedAt: e.target.value })} className="mt-1 min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px]" />
                  </div>
                  <div>
                    <label className="block text-[16px] font-semibold">Price (₦)</label>
                    <input value={ef.price} onChange={(e) => setEf({ ...ef, price: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className="tabular mt-1 min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px]" />
                  </div>
                </div>
                <label className="mt-3 block text-[16px] font-semibold">Host</label>
                <select value={ef.agentId} onChange={(e) => setEf({ ...ef, agentId: e.target.value })} className="mt-1 min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px]">
                  <option value="">No host yet</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.publicName} ({a.fullName})</option>)}
                </select>
                <button onClick={() => saveEdit(l.id)} className="mt-3 w-full min-h-[52px] rounded-xl bg-proof-600 px-4 text-[18px] font-bold text-white">
                  Save details
                </button>
              </div>
            )}
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
                  <button onClick={() => setStatus(l.id, "Unavailable")} className="min-h-[48px] rounded-xl glass-soft px-2 py-2 text-[16px] font-semibold">
                    Pause
                  </button>
                </>
              )}
              <button onClick={() => toggleSlots(l.id)} className="col-span-2 min-h-[48px] rounded-xl glass-soft px-2 py-2 text-[16px] font-semibold">
                {openSlots === l.id ? "Hide times ▴" : "Viewing times ▾"}
              </button>
            </div>
            {openSlots === l.id && (
              <div className="mt-2 rounded-xl bg-sand-100 p-3">
                {(slots[l.id] ?? []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 border-b border-white py-2 text-[16px] last:border-0">
                    <span>{new Date(s.startsAt).toLocaleString()} · {s.bookedCount}/{s.capacity} taken</span>
                    <button onClick={() => dropSlot(l.id, s.id)} aria-label="Remove time" className="min-h-[44px] min-w-[44px] rounded-lg glass-soft px-3 font-bold">×</button>
                  </div>
                ))}
                {!(slots[l.id] ?? []).length && <p className="py-2 text-[16px]">No times yet — add the first below.</p>}
                <div className="mt-2 flex gap-2">
                  <input
                    type="datetime-local"
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value)}
                    aria-label="New viewing time"
                    className="min-h-[48px] w-full rounded-xl border border-slate-200 glass-soft glass-input px-3 text-[16px]"
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
