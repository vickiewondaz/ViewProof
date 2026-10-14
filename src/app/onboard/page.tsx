"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// First-run desk: signed-in owner without an agency founds one here and
// becomes its owner. One agency per account (open a second account for more).
export default function OnboardPage() {
  const [me, setMe] = useState<{ agencyId?: string | null } | null>(null);
  const [f, setF] = useState({ name: "", contact: "", areas: "", policy: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((j) => setMe(j.ok ? j.user : null)).catch(() => null);
  }, []);

  const create = async () => {
    if (f.name.trim().length < 2) return setMsg("What is your agency called?");
    if (f.contact.trim().length < 7) return setMsg("Add the public WhatsApp number buyers should reach.");
    const areas = f.areas.split(",").map((a) => a.trim()).filter(Boolean);
    if (!areas.length) return setMsg("Which areas do you cover? e.g. Gwarinpa, Lekki");
    setBusy(true);
    const res = await fetch("/api/agencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.name.trim(), contactPublic: f.contact.trim(), areas, policyText: f.policy || undefined }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) window.location.href = "/dashboard/listings";
    else setMsg(j.error ?? "Couldn't create — try again.");
  };

  if (me === null) return <main className="mx-auto max-w-md px-4 py-6"><p className="text-[16px]">Checking who you are…</p></main>;
  if (!me) return <main className="mx-auto max-w-md px-4 py-6"><p className="text-[16px]">Sign in first, then come back here.</p><Button asChild size="lg" className="mt-3 w-full"><Link href="/login">Sign in</Link></Button></main>;
  if (me.agencyId) return <main className="mx-auto max-w-md px-4 py-6"><p className="text-[16px]">You already have an agency 🎉</p><Button asChild size="lg" className="mt-3 w-full"><Link href="/dashboard">Open dashboard</Link></Button></main>;

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-6 md:max-w-lg">
      <h1 className="font-display text-[32px] font-bold">Set up your agency 🏠</h1>
      <p className="mt-1 text-[16px]">Two minutes, then add places.</p>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
      <label className="mt-4 block text-[16px] font-semibold" htmlFor="ag-name">Agency name</label>
      <input id="ag-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. BrightHomes Agency" className="mt-1 w-full rounded-xl border-2 border-line px-4 py-4 text-[16px]" />
      <label className="mt-3 block text-[16px] font-semibold" htmlFor="ag-contact">Public WhatsApp number</label>
      <input id="ag-contact" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="+234 800 000 0000" inputMode="tel" className="mt-1 w-full rounded-xl border-2 border-line px-4 py-4 text-[16px]" />
      <label className="mt-3 block text-[16px] font-semibold" htmlFor="ag-areas">Areas you cover <span className="font-normal">(comma separated)</span></label>
      <input id="ag-areas" value={f.areas} onChange={(e) => setF({ ...f, areas: e.target.value })} placeholder="Gwarinpa, Lekki" className="mt-1 w-full rounded-xl border-2 border-line px-4 py-4 text-[16px]" />
      <Button onClick={create} disabled={busy} size="lg" className="mt-4 w-full">
        {busy ? "Creating…" : "Create my agency"}
      </Button>
    </main>
  );
}
