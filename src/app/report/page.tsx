"use client";
import { useState } from "react";

const CATS = ["unavailable", "price", "location", "agent-absent", "differs", "safety", "other"];

// Bottom-sheet style report form. Public — no account needed.
export default function ReportPage() {
  const [listingId, setListingId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [category, setCategory] = useState("unavailable");
  const [detail, setDetail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, bookingId: bookingId || undefined, category, detail: detail || undefined }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? j.message : j.error ?? "Failed — check the listing ID.");
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-2xl bg-white p-4">
        <h1 className="text-[20px] font-bold">What went wrong?</h1>
        <input value={listingId} onChange={(e) => setListingId(e.target.value)} placeholder="Listing ID" className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Booking ID (optional)" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        <div className="mt-3 grid gap-2">
          {CATS.map((c) => (
            <label key={c} className="flex items-center gap-2 rounded-xl bg-sand-100 px-3 py-2 text-sm">
              <input type="radio" checked={category === c} onChange={() => setCategory(c)} />
              {c}
            </label>
          ))}
        </div>
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Optional detail" rows={3} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        <button onClick={submit} className="mt-3 w-full rounded-xl bg-coral-500 px-4 py-3 text-white">Send report</button>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </div>
    </main>
  );
}
