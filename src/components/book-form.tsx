"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { EmptySlots } from "./human";

type Slot = { id: string; startsAt: string; left: number };

// Human-first booking: pick a time, tell us who you are, done.
// One question per glance, plain words, always free.
export default function BookForm({
  listingId,
  slots,
  contact,
}: {
  listingId: string;
  slots: Slot[];
  contact?: string | null;
}) {
  const router = useRouter();
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [move, setMove] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<{ id: string; code?: string; codeExpires?: string } | null>(null);

  if (!slots.length) return <EmptySlots contact={contact} />;

  const submit = async () => {
    if (!slotId) return setMsg("Pick a time above first.");
    if (name.trim().length < 2) return setMsg("Tell us your name so the host knows who to expect.");
    if (phone.trim().length < 7) return setMsg("Add your WhatsApp number — your code arrives there.");
    // Booking needs the server (slot lock) — say so instead of failing.
    if (!navigator.onLine) return setMsg("You're offline — reconnect to book. Your picks stay filled.");
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        slotId,
        buyerName: name.trim(),
        buyerPhone: phone.trim(),
        prequal: { budgetBand: budget || undefined, moveDate: move || undefined, consent: true },
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) {
      // Fresh bookings carry the meeting code once (WhatsApp may be delayed
      // pre-template-approval). Show it for screenshot — the pass page never
      // renders it again, so don't navigate past this until they tap through.
      if (j.booking?.code) setWon({ id: j.booking.id, code: j.booking.code, codeExpires: j.booking.codeExpires });
      else router.push(`/b/${j.booking.id}`);
    } else {
      setMsg(j.error ?? "That didn't go through — check your network and try again.");
    }
  };

  if (won) {
    return (
      <div className="glass mt-5 rounded-2xl p-5 text-center md:p-8">
        <p className="text-[14px] font-bold tracking-wide text-proof-600">YOU&apos;RE BOOKED ✓</p>
        <h2 className="mt-1 text-[22px] font-bold">Your meeting code</h2>
        <p className="tabular mt-3 text-[44px] font-bold tracking-[0.3em] text-proof-700" aria-label={`Meeting code ${won.code}`}>
          {won.code}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[16px]">
          Screenshot this now. Your host asks for it at the gate.
          {won.codeExpires ? ` It expires ${new Date(won.codeExpires).toLocaleString()}.` : ""}
        </p>
        <p className="mt-1 text-[16px] text-clay">It also arrives on WhatsApp when messaging is approved.</p>
        <Button size="lg" className="mt-4 w-full" onClick={() => router.push(`/b/${won.id}`)}>
          Open my viewing pass →
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mt-5 text-[18px] font-bold">1 · Pick a time</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2" role="radiogroup" aria-label="Viewing times">
        {slots.slice(0, 6).map((s) => (
          <label
            key={s.id}
            className={`min-h-[56px] cursor-pointer rounded-xl border-2 px-4 py-3 text-[16px] ${slotId === s.id ? "border-proof-600 bg-proof-100" : "border-line"} ${s.left <= 0 ? "opacity-50" : ""}`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={slotId === s.id}
              disabled={s.left <= 0}
              onChange={() => setSlotId(s.id)}
            />
            <span className="font-semibold">{new Date(s.startsAt).toLocaleString()}</span>
            <br />
            <span>{s.left > 0 ? `${s.left} place${s.left > 1 ? "s" : ""} left · free` : "Full"}</span>
          </label>
        ))}
      </div>

      <h2 className="mt-5 text-[18px] font-bold">2 · Who&apos;s coming?</h2>
      <label className="mt-2 block text-[16px] font-semibold" htmlFor="bk-name">Your name</label>
      <input
        id="bk-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Funke Ade"
        autoComplete="name"
        className="mt-1 w-full rounded-xl border-2 border-line glass-soft glass-input px-4 py-4 text-[16px]"
      />
      <label className="mt-3 block text-[16px] font-semibold" htmlFor="bk-phone">WhatsApp number</label>
      <input
        id="bk-phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+234 800 000 0000"
        inputMode="tel"
        autoComplete="tel"
        className="mt-1 w-full rounded-xl border-2 border-line glass-soft glass-input px-4 py-4 text-[16px]"
      />
      <p className="mt-1 text-[14px] text-clay">Code arrives here. Never shared.</p>

      <details className="mt-3">
        <summary className="min-h-[48px] cursor-pointer py-2 text-[16px] font-semibold text-pine-900">
          Anything we should know? (optional)
        </summary>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[16px] font-semibold" htmlFor="bk-budget">Budget</label>
            <input
              id="bk-budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. ₦3–4m yearly"
              className="mt-1 w-full rounded-xl border-2 border-line glass-soft glass-input px-4 py-4 text-[16px]"
            />
          </div>
          <div>
            <label className="block text-[16px] font-semibold" htmlFor="bk-move">Moving when?</label>
            <input
              id="bk-move"
              value={move}
              onChange={(e) => setMove(e.target.value)}
              placeholder="e.g. December"
              className="mt-1 w-full rounded-xl border-2 border-line glass-soft glass-input px-4 py-4 text-[16px]"
            />
          </div>
        </div>
      </details>

      <div className="sticky-cta mt-3 md:static md:bg-none md:pb-0">
        <Button
          onClick={submit}
          disabled={busy}
          size="lg"
          className="w-full"
        >
          {busy ? "Booking you in…" : "3 · Book my free viewing"}
        </Button>
        <p className="mt-2 text-center text-[14px] text-clay">
          Tapping Book means: WhatsApp me about this viewing. Free. No payment before we meet.
        </p>
      </div>
      {msg && <p className="mt-2 text-[16px]" role="status">{msg}</p>}
    </div>
  );
}
