"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Issue = { id: string; category: string; detail?: string | null; status: string; createdAt: string; listingId: string };

// Reviewer/owner triage — human decision only, no automatic enforcement.
export default function ReviewPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const res = await fetch("/api/issues");
    const j = await res.json().catch(() => ({}));
    if (j.ok) setIssues(j.issues);
    else setMsg("Sign in as owner/reviewer to triage.");
    setLoaded(true);
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
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <a href="/dashboard" className="inline-block min-h-[44px] py-2 text-[16px] font-semibold text-sky-500">← Dashboard</a>
      <h1 className="text-[26px] font-bold md:text-[32px]">Needs review</h1>
      <p className="mt-1 max-w-2xl text-[16px]">
        Conflicts and reports. Humans decide — nothing automatic.
      </p>
      {msg && <p className="mt-3 text-[16px]">{msg}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {issues.map((i) => (
          <div key={i.id} className="glass rounded-2xl p-4 text-[16px]">
            <p className="font-semibold">{i.category} · {i.status}</p>
            <p className="mt-1 text-[16px]">{i.detail || "No detail."}</p>
            <p className="mt-1 text-[14px] text-slate-500">{new Date(i.createdAt).toLocaleString()}</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <Button onClick={() => triage(i.id, "UnderReview")} variant="secondary">I&apos;m looking into it</Button>
              <Button onClick={() => triage(i.id, "Resolved")}>Fixed ✓</Button>
              <Button onClick={() => triage(i.id, "Dismissed")} variant="ghost">Not an issue</Button>
            </div>
          </div>
        ))}
        {!loaded && <p className="text-[16px]">Fetching the queue…</p>}
        {loaded && !issues.length && !msg && <p className="text-[16px]">Queue empty. Everything calm 🎉</p>}
      </div>
    </main>
  );
}
