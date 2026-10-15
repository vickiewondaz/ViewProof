"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mapListingColumns } from "@/lib/docparse";

type Shape =
  | { kind: "table"; delimiter: string; headers: string[]; rows: string[][] }
  | { kind: "text"; preview: string; words: number };

type Parsed = { name: string; shape: Shape; ocr?: string; chars: number };

// Documents inbox: upload a rent roll, inventory, or agreement scan.
// Tables map to listing columns and import as drafts; prose just previews.
// The detector decides — never the uploader's file extension.
export default function DocumentsPage() {
  const [doc, setDoc] = useState<Parsed | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  const parse = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setMsg(""); setDone(""); setDoc(null);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("name", f.name);
    const res = await fetch("/api/documents/parse", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!j.ok) return setMsg(j.error ?? "Couldn't read that file.");
    setDoc(j);
  };

  const importTable = async () => {
    if (!doc || doc.shape.kind !== "table") return;
    const map = mapListingColumns(doc.shape.headers);
    if (map.title === undefined || map.area === undefined || map.price === undefined)
      return setMsg("Needs at least title, area and price columns — rename headers and re-upload.");
    const head = ["title", "type", "area", "price", "currency", "agentPhone"];
    const lines = [head.join(",")];
    for (const r of doc.shape.rows) {
      const cell = (i?: number) => {
        const v = i === undefined ? "" : (r[i] ?? "");
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      };
      lines.push([cell(map.title), "rent", cell(map.area), cell(map.price), "NGN", cell(map.phone)].join(","));
    }
    setBusy(true);
    const res = await fetch("/api/listings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: lines.join("\n") }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) setDone(`${j.created?.length ?? 0} draft listings ready — review them on the listings page.${j.errors?.length ? ` ${j.errors.length} rows need fixing.` : ""}`);
    else setMsg(j.error ?? "Import failed.");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <a href="/dashboard/listings" className="inline-block min-h-[44px] py-2 text-[16px] font-semibold text-pine-900">← Listings</a>
      <p className="eyebrow">Documents</p>
      <h1 className="font-display text-[32px] font-bold">Paper → listings</h1>
      <p className="mt-1 max-w-2xl text-[16px] text-clay">
        Upload a rent roll, inventory, or agreement — CSV, text, PDF, or a straight photo.
        Tables import as draft listings. Prose just shows what it says.
      </p>
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
      {done && <p className="mt-3 rounded-2xl bg-proof-100 p-4 text-[16px]" role="status">✓ {done}</p>}

      <label className="glass mt-4 block cursor-pointer p-6 text-center">
        <span className="text-[18px] font-bold">{busy ? "Reading…" : "Tap to choose a file"}</span>
        <br />
        <span className="text-[14px] text-clay">CSV · TXT · PDF · JPG · PNG — 5MB max</span>
        <input
          type="file"
          className="hidden"
          accept=".csv,.txt,.md,.pdf,.jpg,.jpeg,.png,.webp,text/csv,text/plain,application/pdf,image/*"
          onChange={(e) => parse(e.target.files?.[0])}
          disabled={busy}
        />
      </label>

      {doc && doc.shape.kind === "table" && (
        <section className="glass mt-4 p-5" aria-label="Detected table">
          <p className="eyebrow">Table detected · {doc.shape.rows.length} rows</p>
          <div className="mt-2 overflow-x-auto">
            <table className="tabular w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-line">
                  {doc.shape.headers.map((h, i) => <th key={i} className="px-2 py-1.5 font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {doc.shape.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {r.map((c, k) => <td key={k} className="px-2 py-1.5">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={importTable} disabled={busy} size="lg" className="mt-4 w-full md:w-auto">
            {busy ? "Importing…" : `Import ${doc.shape.rows.length} as draft listings`}
          </Button>
        </section>
      )}

      {doc && doc.shape.kind === "text" && (
        <section className="glass mt-4 p-5" aria-label="Detected text">
          <p className="eyebrow">
            {doc.ocr === "empty" ? "No readable text" : doc.ocr === "photo" ? "Photo read · prose" : "Prose"} · {doc.shape.words} words
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[16px]">
            {doc.ocr === "empty"
              ? "This scan has no readable text layer — re-snap it straight, closer, in good light, or type the key rows into a CSV."
              : doc.shape.preview}
          </p>
        </section>
      )}
    </main>
  );
}
