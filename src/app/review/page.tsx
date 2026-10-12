"use client";
import { useEffect, useState } from "react";

type Issue = { id: string; category: string; detail?: string | null; status: string; createdAt: string; listingId: string };

// Reviewer/owner triage — human decision only, no automatic enforcement.
export default function ReviewPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await fetch("/api/issues");
    const j = await res.json().catch(() => ({}));
    if (j.ok) setIssues(j.issues);
    else setMsg("Sign in as owner/reviewer to triage.");
  };
  useEffect(() => {
    load();
  }, []);

  const triage = async (id: string, status: string) => {
    const res = await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? `Marked ${status}.` : j.error ?? "Failed");
    if (j.ok) load();
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-[26px] font-bold">Needs review</h1>
      <p className="mt-1 text-sm">
        Conflicts, stale flags, and buyer reports. Human decision only — no automatic enforcement.
      </p>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
      <div className="mt-4 grid gap-2">
        {issues.map((i) => (
          <div key={i.id} className="rounded-2xl bg-white p-4 text-sm">
            <p className="font-semibold">{i.category} · {i.status}</p>
            <p className="mt-1">{i.detail || "No detail."}</p>
            <p className="mt-1 text-xs text-slate-500">{new Date(i.createdAt).toLocaleString()}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <button onClick={() => triage(i.id, "UnderReview")} className="rounded-lg bg-sand-100 px-2 py-2 font-semibold">Reviewing</button>
              <button onClick={() => triage(i.id, "Resolved")} className="rounded-lg bg-proof-100 px-2 py-2 font-semibold">Resolve</button>
              <button onClick={() => triage(i.id, "Dismissed")} className="rounded-lg bg-white px-2 py-2 font-semibold">Dismiss</button>
            </div>
          </div>
        ))}
        {!issues.length && <p className="text-sm">Queue empty. 🎉</p>}
      </div>
    </main>
  );
}
