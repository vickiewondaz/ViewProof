"use client";
import { useState } from "react";

export default function AgentPage() {
  const [code, setCode] = useState("");
  // TODO Phase 4: POST /api/checkin { bookingId, code }, QR fallback, offline queue.
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-[26px] font-bold">Confirm viewing</h1>
      <p className="mt-1 text-sm">
        Enter the buyer&apos;s six-digit code from their Viewing Pass.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        maxLength={6}
        placeholder="______"
        className="tabular mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-center text-2xl tracking-[0.5em]"
      />
      <button className="mt-3 w-full rounded-xl bg-proof-600 px-4 py-4 text-white">
        Confirm check-in
      </button>
      <button className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold">
        Report an issue
      </button>
    </main>
  );
}
