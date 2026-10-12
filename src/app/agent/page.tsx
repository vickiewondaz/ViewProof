"use client";
import { useState } from "react";

// Agent check-in — big-text sunlight mode. Works online; PWA queues offline
// (Phase 6 service worker) with "will sync" notice. QR fallback reuses same
// bookingId + code payload.
export default function AgentPage() {
  const [bookingId, setBookingId] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);

  const submit = async (action: string) => {
    setMsg("");
    setReceipt(null);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, code: code || undefined, action }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.ok && j.receipt) {
      setReceipt(`Checked in ${new Date(j.receipt.checkin).toLocaleString()}. Receipt sent on WhatsApp.`);
    } else if (j.ok) {
      setMsg(`Recorded: ${j.booking?.status ?? action}.`);
    } else {
      setMsg(j.error ?? "Failed — check booking ID and code.");
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-[26px] font-bold">Confirm viewing</h1>
      <p className="mt-1 text-sm">
        Open the booking, ask the buyer&apos;s six-digit code, confirm.
      </p>
      <input
        value={bookingId}
        onChange={(e) => setBookingId(e.target.value)}
        placeholder="Booking ID"
        className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        maxLength={6}
        placeholder="______"
        className="tabular mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-center text-2xl tracking-[0.5em]"
      />
      <button
        onClick={() => submit("checkin")}
        className="mt-3 w-full rounded-xl bg-proof-600 px-4 py-4 text-lg text-white"
      >
        Confirm check-in
      </button>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <button onClick={() => submit("no-show-buyer")} className="rounded-xl bg-white px-2 py-3 font-semibold">Buyer no-show</button>
        <button onClick={() => submit("no-show-agent")} className="rounded-xl bg-white px-2 py-3 font-semibold">Agent no-show</button>
        <button onClick={() => submit("unavailable")} className="rounded-xl bg-white px-2 py-3 font-semibold">Unavailable</button>
      </div>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
      {receipt && <p className="mt-3 rounded-xl bg-proof-100 p-3 text-sm">🎉 {receipt}</p>}
      <button className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold">
        Report an issue
      </button>
      <p className="mt-2 text-xs">Offline? The code queues in the PWA and syncs.</p>
    </main>
  );
}
