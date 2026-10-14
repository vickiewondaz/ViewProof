"use client";
import { useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "./ui/button";

const CHIPS = ["Is it still available?", "Who will meet me?", "How do I book?", "What if I need to cancel?"];

// Friendly face on honest machinery: quick chips + free questions,
// every answer from the card's own record, humans one tap away.
export default function AskBox({ slug }: { slug: string }) {
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ me: string; bot: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setBusy(true);
    const res = await fetch("/api/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, question }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setLog((l) => [...l, { me: question, bot: j.ok ? j.answer : "Hmm, that didn't send — check your network and try again." }]);
    setQ("");
  };

  return (
    <div className="mt-5 rounded-2xl bg-sand-100 p-4">
      <p className="text-[18px] font-bold">Questions? Ask me 🙂</p>
      <p className="text-[14px] text-clay">I answer from this card only — I never guess.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => ask(c)} className="glass-soft min-h-[44px] rounded-full px-3 text-[14px] font-semibold">
            {c}
          </button>
        ))}
      </div>
      {log.length > 0 && (
        <div className="mt-3 grid gap-2">
          {log.map((m, i) => (
            <div key={i} className="grid gap-1">
              <p className="justify-self-end rounded-2xl rounded-br-md bg-proof-600 px-3 py-2 text-[16px] text-white">{m.me}</p>
              <p className="justify-self-start rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[16px]">{m.bot}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(q)}
          placeholder="Type your question…"
          aria-label="Ask about this place"
          className="glass-soft glass-input min-h-[48px] w-full rounded-xl px-4 text-[16px]"
        />
        <Button onClick={() => ask(q)} disabled={busy} aria-label="Ask about this place">
          {busy ? "…" : <><SendHorizonal /> Ask</>}
        </Button>
      </div>
    </div>
  );
}
