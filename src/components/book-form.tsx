"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!slots.length) return <EmptySlots contact={contact} />;

  const submit = async () => {
    if (!slotId) return setMsg("Pick a time above first.");
    if (name.trim().length < 2) return setMsg("Tell us your name so the host knows who to expect.");
    if (phone.trim().length < 7) return setMsg("Add your WhatsApp number — your code arrives there.");
    if (!consent) return setMsg("Please accept the viewing arrangement so we can book you.");
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
        prequal: { budgetBand: budget || undefined, moveDate: move || undefined, consent },
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) {
      router.push(`/b/${j.booking.id}`);
    } else {
      setMsg(j.error ?? "That didn't go through — check your network and try again.");
    }
  };

  return (
    <div>
      <h2 className="mt-5 text-[18px] font-bold">Pick a time that suits you</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2" role="radiogroup" aria-label="Viewing times">
        {slots.slice(0, 6).map((s) => (
          <label
            key={s.id}
            className={`min-h-[56px] cursor-pointer rounded-xl border-2 px-4 py-3 text-[16px] ${slotId === s.id ? "border-proof-600 bg-proof-100" : "border-slate-200"} ${s.left <= 0 ? "opacity-50" : ""}`}
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

      <h2 className="mt-5 text-[18px] font-bold">Who&apos;s coming?</h2>
      <label className="mt-2 block text-[16px] font-semibold" htmlFor="bk-name">Your name</label>
      <input
        id="bk-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Funke Ade"
        autoComplete="name"
        className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]"
      />
      <label className="mt-3 block text-[16px] font-semibold" htmlFor="bk-phone">WhatsApp number</label>
      <input
        id="bk-phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+234 800 000 0000"
        inputMode="tel"
        autoComplete="tel"
        className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]"
      />
      <p className="mt-1 text-[14px] text-slate-500">Your meeting code arrives here. We never share your number.</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[16px] font-semibold" htmlFor="bk-budget">Budget <span className="font-normal">(optional)</span></label>
          <input
            id="bk-budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. ₦3–4m yearly"
            className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]"
          />
        </div>
        <div>
          <label className="block text-[16px] font-semibold" htmlFor="bk-move">Moving when? <span className="font-normal">(optional)</span></label>
          <input
            id="bk-move"
            value={move}
            onChange={(e) => setMove(e.target.value)}
            placeholder="e.g. December"
            className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]"
          />
        </div>
      </div>

      <label className="mt-4 flex min-h-[56px] cursor-pointer items-start gap-3 rounded-xl bg-sand-100 px-4 py-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-6 w-6 accent-[#177E5C]"
        />
        <span className="text-[16px]">
          Yes — contact me on WhatsApp about this viewing. Free viewing, no
          payment before we meet.
        </span>
      </label>

      <div className="sticky-cta mt-3 md:static md:bg-none md:pb-0">
        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-xl bg-proof-600 px-4 py-4 text-[18px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Booking you in…" : "Book my free viewing"}
        </button>
      </div>
      {msg && <p className="mt-2 text-[16px]" role="status">{msg}</p>}
    </div>
  );
}
