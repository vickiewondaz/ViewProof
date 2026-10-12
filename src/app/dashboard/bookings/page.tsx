"use client";
import { useEffect, useState } from "react";

type Booking = {
  id: string; buyerName: string; buyerPhone: string; status: string;
  listing: { title: string; area: string }; slot: { startsAt: string };
  agent?: { publicName: string; fullName: string } | null;
  reliability?: { attended: number; total: number; label: string };
  closedPrice?: string | number | null; closedAt?: string | null;
  payoutStatus?: string | null;
};

const digits = (s: string) => s.replace(/\D/g, "");

// Owner's bookings desk: every live viewing, buyer one tap away,
// honest cancel when plans change — plus deal closes and payouts.
export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [done, setDone] = useState<Booking[]>([]);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [closePrice, setClosePrice] = useState<Record<string, string>>({});

  const load = async () => {
    const [r, h] = await Promise.all([
      fetch("/api/bookings?day=upcoming").then((x) => x.json()).catch(() => ({})),
      fetch("/api/bookings?day=history").then((x) => x.json()).catch(() => ({})),
    ]);
    if (r.ok) setBookings(r.bookings);
    else setMsg("Sign in as owner to see bookings.");
    setLoaded(true);
    if (h.ok) setDone(h.bookings);
  };
  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, action: string, extra?: object) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? "Done ✓" : j.error ?? "Couldn't do that.");
    if (j.ok) load();
  };

  const closeCard = (b: Booking) => (
    <div key={b.id} className="mt-2 rounded-xl bg-sand-100 p-3">
      {b.closedAt ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[16px]">
            Closed <span className="tabular font-bold">{b.closedPrice ? Number(b.closedPrice).toLocaleString() : ""}</span>
            {" · "}{b.payoutStatus === "Paid" ? "paid ✓" : "payout pending ⏳"}
          </p>
          {b.payoutStatus !== "Paid" && (
            <button onClick={() => act(b.id, "payout")} className="min-h-[48px] rounded-xl bg-proof-600 px-4 text-[16px] font-bold text-white">
              Mark paid
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={closePrice[b.id] ?? ""}
            onChange={(e) => setClosePrice({ ...closePrice, [b.id]: e.target.value.replace(/\D/g, "") })}
            placeholder="Closed price ₦"
            inputMode="numeric"
            aria-label="Closed price in naira"
            className="tabular min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px]"
          />
          <button
            onClick={() => {
              if (!Number(closePrice[b.id])) return setMsg("Add the closed price first — the exact naira both sides agreed.");
              act(b.id, "close", { closedPrice: Number(closePrice[b.id]) });
            }}
            className="min-h-[48px] shrink-0 rounded-xl bg-proof-600 px-4 text-[16px] font-bold text-white"
          >
            Close deal 🤝
          </button>
        </div>
      )}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <a href="/dashboard" className="inline-block min-h-[44px] py-2 text-[16px] font-semibold text-sky-500">← Dashboard</a>
      <h1 className="text-[26px] font-bold md:text-[32px]">Upcoming viewings</h1>
      <p className="mt-1 max-w-2xl text-[16px]">
        Everyone coming, when, and how to reach them.
      </p>
      <div className="mt-3">
        <a href="/api/ledger?format=csv" className="glass-soft inline-block rounded-xl px-4 py-3 text-[16px] font-semibold">
          📜 Export commission evidence (CSV)
        </a>
        <p className="mt-1 text-[14px] text-slate-500">Settles “whose buyer?” — every viewing, agent, outcome.</p>
      </div>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bookings.map((b) => {
          const wa = `https://wa.me/${digits(b.buyerPhone)}?text=${encodeURIComponent(`Hi ${b.buyerName}! About your viewing for ${b.listing.title} on ${new Date(b.slot.startsAt).toLocaleString()} —`)}`;
          return (
            <article key={b.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[18px] font-bold leading-snug">{b.listing.title}</p>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-[14px] font-bold ${b.status === "Confirmed" ? "bg-proof-100" : "bg-sun-100"}`}>
                  {b.status}
                </span>
              </div>
              <p className="tabular mt-1 text-[16px] font-semibold">
                {new Date(b.slot.startsAt).toLocaleString()}
              </p>
              <p className="mt-1 text-[16px]">
                {b.buyerName} · <span className="tabular">{b.buyerPhone}</span>
              </p>
              {b.reliability && b.reliability.total > 0 && (
                <p className="mt-1 text-[14px]">🤝 Buyer: {b.reliability.label}</p>
              )}
              <p className="mt-1 text-[14px] text-slate-500">
                {b.listing.area}{b.agent ? ` · host ${b.agent.publicName}` : ""}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={wa} target="_blank" rel="noreferrer" className="glass-soft flex min-h-[48px] items-center justify-center rounded-xl px-2 text-[16px] font-semibold">
                  Message buyer
                </a>
                {b.status === "Requested" && (
                  <button onClick={() => act(b.id, "confirm")} className="min-h-[48px] rounded-xl bg-proof-600 px-2 text-[16px] font-bold text-white">
                    Confirm ✓
                  </button>
                )}
                <button onClick={() => act(b.id, "cancel-agency")} className={`glass-soft min-h-[48px] rounded-xl px-2 text-[16px] font-semibold ${b.status === "Confirmed" ? "col-span-2" : ""}`}>
                  {b.status === "Requested" ? "Decline" : "Cancel viewing"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!loaded && <p className="mt-6 text-center text-[16px]">Checking the diary…</p>}
      {loaded && !bookings.length && (
        <p className="mt-6 text-center text-[16px]">Nothing upcoming — share a Viewing Card and bookings land here.</p>
      )}

      <h2 className="mt-8 text-[22px] font-bold">Recently done 🤝</h2>
      <p className="mt-1 max-w-2xl text-[16px]">Close deals. Track payouts.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {done.filter((b) => b.status === "Completed").map((b) => (
          <article key={b.id} className="glass rounded-2xl p-4">
            <p className="text-[18px] font-bold leading-snug">{b.listing.title}</p>
            <p className="mt-1 text-[16px]">{b.buyerName} · host {b.agent?.publicName ?? "—"}</p>
            <p className="tabular mt-1 text-[14px] text-slate-500">{new Date(b.slot.startsAt).toLocaleString()}</p>
            {closeCard(b)}
          </article>
        ))}
      </div>
      {!done.filter((b) => b.status === "Completed").length && (
        <p className="mt-4 text-[16px]">No completed viewings yet — closed deals appear here.</p>
      )}
    </main>
  );
}
