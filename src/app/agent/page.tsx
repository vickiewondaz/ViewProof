"use client";
import { useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type DayBooking = {
  id: string; buyerName: string; buyerPhone: string; status: string; listingId: string;
  listing: { title: string; area: string; commissionTerms?: string | null }; slot: { startsAt: string };
  reliability?: { attended: number; total: number; label: string };
};

type Deal = {
  id: string; buyer: string; listing: string; area: string; price: string;
  terms: string; payout: string; paidAt: string | null; closedAt: string | null; agreed: boolean;
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
  const [agreedIds, setAgreedIds] = useState<string[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealsMsg, setDealsMsg] = useState("");

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
  useEffect(() => {
    fetch("/api/agreements")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setAgreedIds((j.agreements as { listingId: string }[]).map((a) => a.listingId));
      })
      .catch(() => null);
    fetch("/api/agents/earnings")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setDeals(j.deals);
        else setDealsMsg(j.error ?? "");
      })
      .catch(() => null);
  }, []);

  const agree = async (listingId: string) => {
    const res = await fetch("/api/agreements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.ok) setAgreedIds((ids) => [...ids, listingId]);
    else setMsg(j.error ?? "Couldn't record that — try again.");
  };

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
      <p className="eyebrow">Agent check-in</p>
      <h1 className="font-display text-[32px] font-bold">You met? Confirm it ✅</h1>
      <p className="mt-1 text-[16px] text-clay">
        Get the buyer&apos;s 6 numbers, type them, tap confirm.
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
                className={`rounded-xl border-2 px-4 py-3 text-left text-[16px] ${bookingId === b.id ? "border-pine-900 bg-pine-100" : "border-line glass-soft glass-input"}`}
              >
                <span className="font-bold">{new Date(b.slot.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                {" · "}{b.listing.title} · {b.buyerName}
                <br />
                <span className="text-[14px]">{b.status}</span>
                {b.reliability && b.reliability.total > 0 && (
                  <><br /><span className="text-[14px]">🤝 {b.reliability.label}</span></>
                )}
                {b.listing.commissionTerms && (
                  <><br /><span className="text-[14px]">✍ Your cut: {b.listing.commissionTerms}</span>
                  <br />
                  {agreedIds.includes(b.listingId) ? (
                    <span className="text-[14px] font-bold">Agreed ✓ on record</span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); agree(b.listingId); }}
                      className="mt-1 min-h-[44px] rounded-full bg-pine-900 px-4 text-[14px] font-bold text-white"
                    >
                      I agree to this cut
                    </button>
                  )}</>
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
        className="mt-1 w-full rounded-xl border-2 border-line glass-soft glass-input px-4 py-4 text-[16px]"
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
        className="tabular mt-1 w-full rounded-xl border-2 border-line glass-soft glass-input px-4 py-5 text-center text-3xl tracking-[0.4em]"
      />
      <Button
        onClick={() => submit("checkin")}
        size="lg"
        className="mt-4 w-full text-[20px]"
      >
        <CheckCheck /> Confirm — we met
      </Button>
      <p className="mt-3 text-center text-[16px] font-semibold">Didn&apos;t happen?</p>
      <div className="mt-2 grid grid-cols-1 gap-2 text-[16px] sm:grid-cols-3">
        <Button onClick={() => submit("no-show-buyer")} variant="secondary">Buyer didn&apos;t come</Button>
        <Button onClick={() => submit("no-show-agent")} variant="secondary">I couldn&apos;t make it</Button>
        <Button onClick={() => submit("unavailable")} variant="secondary">Place unavailable</Button>
      </div>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
      {receipt && <p className="mt-3 rounded-xl bg-proof-100 p-4 text-[16px]" role="status">🎉 {receipt}</p>}

      <section className="glass mt-6 p-5" aria-label="My earnings">
        <p className="eyebrow">My earnings</p>
        <h2 className="font-display text-[22px] font-bold">Closed deals, on record</h2>
        {deals.length === 0 && (
          <p className="mt-2 text-[16px] text-clay">
            {dealsMsg || "Nothing closed yet — attended viewings that close appear here with price, terms, and payout."}
          </p>
        )}
        <div className="mt-3 grid gap-2">
          {deals.map((d) => (
            <div key={d.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[16px] font-bold leading-snug">{d.listing}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[14px] font-bold ${d.payout === "Paid" ? "bg-proof-100" : "bg-brass-100"}`}>
                  {d.payout === "Paid" ? "Paid ✓" : "Pending"}
                </span>
              </div>
              <p className="tabular mt-1 text-[18px] font-bold">{d.price}</p>
              <p className="mt-1 text-[14px] text-clay">
                {d.buyer} · closed {d.closedAt ? new Date(d.closedAt).toLocaleDateString() : "—"}
                {d.payout === "Paid" && d.paidAt ? ` · paid ${new Date(d.paidAt).toLocaleDateString()}` : ""}
              </p>
              <p className="mt-1 text-[14px]">✍ {d.terms || "No terms recorded"} {d.agreed ? "· agreed ✓" : "· not agreed"}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[14px] text-clay">ViewProof keeps the record. Money moves between you and your owner — chase the Pending ones there.</p>
      </section>
      <Button variant="ghost" className="mt-3 w-full">
        Something wrong? Report it
      </Button>
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
      <p className="mt-3 rounded-xl bg-sun-100 p-3 text-center text-[16px]">Offline? Codes save and sync later.</p>
    </main>
  );
}
