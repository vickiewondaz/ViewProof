"use client";
import { useEffect, useState } from "react";

type Agency = {
  id: string; name: string; contact: string; status: string;
  createdAt: string; listings: number; agents: number; owner: string | null;
};

// The landlord's office: every shop, one screen. Lock doors, don't demolish:
// suspend hides cards + blocks bookings; records stay for trust + law.
export default function AdminPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [msg, setMsg] = useState("");
  const [banEmail, setBanEmail] = useState("");
  const [banReason, setBanReason] = useState("");

  const load = async () => {
    const r = await fetch("/api/admin/agencies").then((x) => x.json()).catch(() => ({}));
    if (r.ok) setAgencies(r.agencies);
    else setMsg(r.status === 403 || !r.ok ? "Landlord only — this page needs an admin sign-in." : "Failed to load.");
  };
  useEffect(() => {
    load();
  }, []);

  const flip = async (a: Agency) => {
    const to = a.status === "Suspended" ? "Active" : "Suspended";
    if (to === "Suspended" && !confirm(`Lock ${a.name}? Their cards vanish and bookings stop. Records stay.`)) return;
    const res = await fetch(`/api/admin/agencies/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? `${a.name} is now ${to}.` : j.error ?? "Failed.");
    if (j.ok) load();
  };

  const ban = async (unban: boolean) => {
    if (!banEmail.includes("@")) return setMsg("Type the account email first.");
    const res = await fetch("/api/admin/users/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: banEmail.trim(), reason: banReason || undefined, unban }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? (unban ? "Account unlocked ✓" : "Account locked ✓") : j.error ?? "Failed.");
    if (j.ok) {
      setBanEmail("");
      setBanReason("");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="text-[26px] font-bold md:text-[32px]">Landlord&apos;s office 🔑</h1>
      <p className="mt-1 max-w-2xl text-[16px]">
        Every shop on one screen. Lock doors when you must — records are never deleted.
      </p>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {agencies.map((a) => (
          <article key={a.id} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[18px] font-bold leading-snug">{a.name}</p>
              <span className={`shrink-0 rounded-lg px-2 py-1 text-[14px] font-bold ${a.status === "Active" ? "bg-proof-100" : "bg-coral-100"}`}>
                {a.status}
              </span>
            </div>
            <p className="tabular mt-1 text-[16px]">{a.contact}</p>
            <p className="mt-1 text-[14px] text-slate-500">
              {a.owner ?? "no owner login yet"} · {a.listings} listings · {a.agents} hosts · since {new Date(a.createdAt).toDateString()}
            </p>
            <button
              onClick={() => flip(a)}
              className={`mt-3 min-h-[48px] w-full rounded-xl px-2 text-[16px] font-bold ${a.status === "Suspended" ? "bg-proof-600 text-white" : "bg-coral-500 text-white"}`}
            >
              {a.status === "Suspended" ? "Reopen shop ✓" : "Lock shop 🔒"}
            </button>
          </article>
        ))}
      </div>
      {!agencies.length && <p className="mt-6 text-center text-[16px]">No shops yet — they appear here as owners sign up.</p>}

      <section className="glass mt-6 rounded-2xl p-4 md:p-6">
        <h2 className="text-[18px] font-bold">Lock a person (abuse only)</h2>
        <p className="mt-1 text-[16px]">
          Prefer locking the shop above. Lock people only for spam or abuse — it signs them out everywhere instantly.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <input value={banEmail} onChange={(e) => setBanEmail(e.target.value)} placeholder="account@email.com" inputMode="email" className="glass-soft glass-input min-h-[48px] rounded-xl px-4 text-[16px]" />
          <input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason (optional)" className="glass-soft glass-input min-h-[48px] rounded-xl px-4 text-[16px]" />
          <button onClick={() => ban(false)} className="min-h-[48px] rounded-xl bg-coral-500 px-4 text-[16px] font-bold text-white">Lock</button>
          <button onClick={() => ban(true)} className="glass-soft min-h-[48px] rounded-xl px-4 text-[16px] font-semibold">Unlock</button>
        </div>
      </section>
    </main>
  );
}
