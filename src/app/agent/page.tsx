"use client";
import { useEffect, useState } from "react";

type DayBooking = {
  id: string; buyerName: string; buyerPhone: string; status: string;
  listing: { title: string; area: string; commissionTerms?: string | null }; slot: { startsAt: string };
  reliability?: { attended: number; total: number; label: string };
};

// Agent check-in — big-text sunlight mode. Works online; PWA queues offline
// (Phase 6 service worker) with "will sync" notice. QR fallback reuses same
// bookingId + code payload.
export default function AgentPage() {
  const [bookingId, setBookingId] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [pushState, setPushState] = useState("");
  const [today, setToday] = useState<DayBooking[]>([]);
  const [dayMsg, setDayMsg] = useState("");
  const [dayLoaded, setDayLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/bookings?day=today")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setToday(j.bookings);
          const next = j.bookings.find((b: DayBooking) => b.status === "Confirmed" || b.status === "Requested");
          if (next && !bookingId) setBookingId(next.id);
        } else {
          setDayMsg("Sign in + link your roster spot to see today's viewings here.");
        }
        setDayLoaded(true);
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setMsg(j.error ?? "Hmm, that didn't work — double-check the booking ID and the 6 numbers, then try again.");
    }
  };

  return (
    <main className="mx-auto max-w-md md:max-w-lg px-4 py-6">
      <h1 className="text-[26px] font-bold">You met? Confirm it ✅</h1>
      <p className="mt-1 text-[16px]">
        Ask the buyer for the 6 numbers from their WhatsApp message, type them
        below, tap confirm. Big buttons — works with one hand in the sun.
      </p>

      {today.length > 0 && (
        <>
          <h2 className="mt-5 text-[18px] font-bold">Today&apos;s viewings</h2>          <div className="mt-2 grid gap-2">
            {today.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBookingId(b.id);
                  setMsg("");
                  setReceipt(null);
                  document.getElementById("code")?.focus();
                }}
                className={`rounded-xl border-2 px-4 py-3 text-left text-[16px] ${bookingId === b.id ? "border-proof-600 bg-proof-100" : "border-slate-200 glass-soft glass-input"}`}
              >
                <span className="font-bold">{new Date(b.slot.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                {" · "}{b.listing.title} · {b.buyerName}
                <br />
                <span className="text-[14px]">{b.status}</span>
                {b.reliability && b.reliability.total > 0 && (
                  <><br /><span className="text-[14px]">🤝 {b.reliability.label}</span></>
                )}
                {b.listing.commissionTerms && (
                  <><br /><span className="text-[14px]">✍ Your cut: {b.listing.commissionTerms}</span></>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {!dayLoaded && (
        <p className="mt-4 rounded-xl bg-sand-100 p-3 text-center text-[16px]">Checking today&apos;s diary…</p>
      )}
      {today.length === 0 && dayLoaded && dayMsg && (
        <p className="mt-4 rounded-xl bg-sand-100 p-3 text-center text-[16px]">{dayMsg}</p>
      )}

      <label className="mt-4 block text-[16px] font-semibold" htmlFor="booking">
        Booking ID (from your WhatsApp alert)
      </label>
      <input
        id="booking"
        value={bookingId}
        onChange={(e) => setBookingId(e.target.value)}
        placeholder="Paste booking ID here"
        autoComplete="off"
        className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]"
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
        className="tabular mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-5 text-center text-3xl tracking-[0.4em]"
      />
      <button
        onClick={() => submit("checkin")}
        className="mt-4 w-full rounded-xl bg-proof-600 px-4 py-5 text-[20px] font-bold text-white"
      >
        Confirm — we met ✅
      </button>
      <p className="mt-3 text-center text-[16px] font-semibold">Didn&apos;t happen? Be honest, tap one:</p>
      <div className="mt-2 grid grid-cols-1 gap-2 text-[16px] sm:grid-cols-3">
        <button onClick={() => submit("no-show-buyer")} className="min-h-[52px] rounded-xl glass-soft px-2 py-3 font-semibold">Buyer didn&apos;t come</button>
        <button onClick={() => submit("no-show-agent")} className="min-h-[52px] rounded-xl glass-soft px-2 py-3 font-semibold">I couldn&apos;t make it</button>
        <button onClick={() => submit("unavailable")} className="min-h-[52px] rounded-xl glass-soft px-2 py-3 font-semibold">Place unavailable</button>
      </div>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
      {receipt && <p className="mt-3 rounded-xl bg-proof-100 p-4 text-[16px]" role="status">🎉 {receipt}</p>}
      <button className="mt-3 w-full rounded-xl glass-soft px-4 py-4 text-[16px] font-semibold">
        Something wrong? Report it
      </button>
      <button
        onClick={async () => {
          try {
            const me = await fetch("/api/me").then((r) => r.json());
            const reg = await navigator.serviceWorker.ready;
            // VAPID key must be a Uint8Array (base64url -> bytes).
            const b64 = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "")
              .replace(/-/g, "+").replace(/_/g, "/");
            const raw = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
            const key = new Uint8Array(Array.from(raw, (c) => c.charCodeAt(0)));
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
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
