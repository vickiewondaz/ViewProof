"use client";
import { useState } from "react";
import { uploadPhoto } from "@/lib/upload-client";

const CATS = [
  { id: "unavailable", label: "Place not available", hint: "They said it's taken or closed" },
  { id: "price", label: "Price is different", hint: "Different from the card" },
  { id: "location", label: "Wrong location", hint: "Not where the card said" },
  { id: "agent-absent", label: "Agent didn't come", hint: "Nobody showed up" },
  { id: "differs", label: "Place looks different", hint: "Very different from pictures" },
  { id: "safety", label: "I felt unsafe", hint: "We'll treat this with care" },
  { id: "other", label: "Something else", hint: "Tell us below" },
];

// Bottom-sheet style report form. Public — no account needed. Big radios,
// plain words, one thumb-friendly column.
export default function ReportPage() {
  const [listingId, setListingId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [category, setCategory] = useState("unavailable");
  const [detail, setDetail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    setMsg("Shrinking photo…");
    try {
      const url = await uploadPhoto(f, "issues");
      setPhotoUrl(url);
      setMsg("Photo added ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Photo failed — you can still send without it.");
    }
  };

  const submit = async () => {
    if (!listingId.trim()) {
      setMsg("Please add the listing ID from your Viewing Card first.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, bookingId: bookingId || undefined, category, detail: detail || undefined, photoUrl: photoUrl || undefined }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(j.ok ? j.message : j.error ?? "That didn't send — check your network and try again.");
  };

  return (
    <main className="mx-auto max-w-md md:max-w-lg px-4 pb-10 pt-6">
      <div className="glass rounded-2xl p-5">
        <h1 className="text-[24px] font-bold">What went wrong?</h1>
        <p className="mt-1 text-[16px]">Tap what happened — a real person reads it.</p>
        <label className="mt-4 block text-[16px] font-semibold" htmlFor="listing">Listing ID (on your card)</label>
        <input id="listing" value={listingId} onChange={(e) => setListingId(e.target.value)} placeholder="e.g. clx…" autoComplete="off" className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-[16px]" />
        <label className="mt-3 block text-[16px] font-semibold" htmlFor="booking">Booking ID <span className="font-normal">(if you booked)</span></label>
        <input id="booking" value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Optional" autoComplete="off" className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-[16px]" />
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label="What went wrong">
          {CATS.map((c) => (
            <label key={c.id} className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ${category === c.id ? "bg-proof-100 outline outline-2 outline-proof-600" : "bg-sand-100"}`}>
              <input type="radio" checked={category === c.id} onChange={() => setCategory(c.id)} className="h-6 w-6 accent-[#177E5C]" />
              <span>
                <span className="block text-[16px] font-bold">{c.label}</span>
                <span className="block text-[16px]">{c.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="mt-4 block text-[16px] font-semibold" htmlFor="detail">Anything else? <span className="font-normal">(optional)</span></label>
        <textarea id="detail" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="In your own words…" rows={3} className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-[16px]" />
        <label className="mt-4 block text-[16px] font-semibold" htmlFor="photo">Photo <span className="font-normal">(optional, helps a lot)</span></label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onPhoto(e.target.files?.[0])}
          className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]"
        />
        {photoUrl && <p className="mt-1 text-[16px]">Photo added ✓</p>}
        <div className="sticky-cta mt-3">
          <button onClick={submit} disabled={busy} className="w-full rounded-xl bg-coral-500 px-4 py-4 text-[18px] font-bold text-white disabled:opacity-60">
            {busy ? "Sending…" : "Send report"}
          </button>
        </div>
        {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
      </div>
    </main>
  );
}
