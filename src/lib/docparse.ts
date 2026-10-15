// Document understanding: given extracted text, decide TABLE vs TEXT.
// Tables: consistent delimiter + column counts + a header row (CSV exports,
// rent rolls, inventory lists). Everything else is prose. Pure + tested.

export type DocShape =
  | { kind: "table"; delimiter: string; headers: string[]; rows: string[][] }
  | { kind: "text"; preview: string; words: number };

const DELIMS = [",", ";", "\t", "|"];

function splitLine(line: string, d: string): string[] {
  // Minimal CSV awareness: quotes protect the delimiter.
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === d && !q) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out.map((c) => c.replace(/^"|"$/g, ""));
}

export function detectShape(raw: string): DocShape {
  const text = raw.replace(/\r/g, "").trim();
  const lines = text.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  if (lines.length >= 2) {
    for (const d of DELIMS) {
      const parsed = lines.map((l) => splitLine(l, d));
      const cols = parsed[0].length;
      if (cols < 2 || cols > 30) continue;
      // ≥80% of rows share the header's column count, cells mostly non-empty.
      const steady = parsed.filter((r) => r.length === cols).length;
      if (steady / parsed.length < 0.8) continue;
      const filled = parsed.flat().filter((c) => c.length > 0).length;
      if (filled / (parsed.length * cols) < 0.5) continue;
      // Header row looks like labels, not values (few digits).
      const digits = (parsed[0].join(" ").match(/\d/g) ?? []).length;
      if (digits > parsed[0].join(" ").length / 2) continue;
      return {
        kind: "table",
        delimiter: d === "\t" ? "tab" : d,
        headers: parsed[0],
        rows: parsed.slice(1),
      };
    }
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return { kind: "text", preview: text.slice(0, 500), words };
}

/** Map table headers to listing-import columns (fuzzy, case-insensitive). */
export function mapListingColumns(headers: string[]): Record<string, number> {
  const want: Record<string, string[]> = {
    title: ["title", "property", "name", "description"],
    area: ["area", "location", "address", "axis"],
    price: ["price", "rent", "amount", "cost"],
    type: ["type", "category", "bedrooms", "beds"],
    phone: ["phone", "contact", "agent", "host"],
  };
  const out: Record<string, number> = {};
  headers.forEach((h, i) => {
    const low = h.toLowerCase();
    for (const [key, alts] of Object.entries(want)) {
      if (out[key] === undefined && alts.some((a) => low.includes(a))) out[key] = i;
    }
  });
  return out;
}
