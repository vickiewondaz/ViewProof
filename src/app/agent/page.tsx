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
  const [pushState, setPushState] = useState("");

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
    <main className="mx-auto max-w-md md:max-w-lg px-4 py-6">
      <h1 className="text-[26px] font-bold">You met? Confirm it ✅</h1>
      <p className="mt-1 text-[16px]">
        Ask the buyer for the 6 numbers from their WhatsApp message, type them
        below, tap confirm. Big buttons — works with one hand in the sun.
      </p>
      <label className="mt-4 block text-[16px] font-semibold" htmlFor="booking">
        Booking ID (from your WhatsApp alert)
      </label>
      <input
        id="booking"
        value={bookingId}
        onChange={(e) => setBookingId(e.target.value)}
        placeholder="Paste booking ID here"
        autoComplete="off"
        className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-[16px]"
      />
      <label className="mt-3 block text-[16px] font-semibold" htmlFor="code">
        Buyer&apos;s 6-digit code
      </label>
      <input
        id="code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="··· ···"
        aria-label="Buyer's six digit code"
        className="tabular mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-5 text-center text-3xl tracking-[0.4em]"
      />
      <button
        onClick={() => submit("checkin")}
        className="mt-4 w-full rounded-xl bg-proof-600 px-4 py-5 text-[20px] font-bold text-white"
      >
        Confirm — we met ✅
      </button>
      <p className="mt-3 text-center text-[16px] font-semibold">Didn&apos;t happen? Be honest, tap one:</p>
      <div className="mt-2 grid grid-cols-1 gap-2 text-[16px] sm:grid-cols-3">
        <button onClick={() => submit("no-show-buyer")} className="min-h-[52px] rounded-xl bg-white px-2 py-3 font-semibold">Buyer didn&apos;t come</button>
        <button onClick={() => submit("no-show-agent")} className="min-h-[52px] rounded-xl bg-white px-2 py-3 font-semibold">I couldn&apos;t make it</button>
        <button onClick={() => submit("unavailable")} className="min-h-[52px] rounded-xl bg-white px-2 py-3 font-semibold">Place unavailable</button>
      </div>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
      {receipt && <p className="mt-3 rounded-xl bg-proof-100 p-4 text-[16px]" role="status">🎉 {receipt}</p>}
      <button className="mt-3 w-full rounded-xl bg-white px-4 py-4 text-[16px] font-semibold">
        Something wrong? Report it
      </button>
      <button
        onClick={async () => {
          try {
            const me = await fetch("/api/me").then((r) => r.json());
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            });
            const j = sub.toJSON();
            await fetch("/api/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys, agencyId: me?.user?.agencyId ?? undefined }),
            });
            setPushState("Alerts on ✓ New bookings will buzz here, plus WhatsApp.");
          } catch {
            setPushState("Couldn't switch alerts on — WhatsApp alerts still work fine.");
          }
        }}
        className="mt-2 w-full rounded-xl bg-sand-100 px-4 py-4 text-[16px] font-semibold"
      >
        Switch booking alerts on 🔔
      </button>
      {pushState && <p className="mt-2 text-[16px]" role="status">{pushState}</p>}
      <p className="mt-3 rounded-xl bg-sun-100 p-3 text-center text-[16px]">No network? The code saves on your phone and syncs later. Don&apos;t worry.</p>
    </main>
  );
}
