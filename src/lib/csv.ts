// Minimal CSV parser (handles quoted commas + escaped quotes).
// Extracted for unit testing; used by /api/listings/import.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = [""];
  let q = false;
  const pushRow = () => {
    if (cur.length > 1 || cur[0] !== "") rows.push(cur);
    cur = [""];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur[cur.length - 1] += '"';
          i++;
        } else q = false;
      } else cur[cur.length - 1] += c;
    } else if (c === '"') q = true;
    else if (c === ",") cur.push("");
    else if (c === "\n") pushRow();
    else if (c !== "\r") cur[cur.length - 1] += c;
  }
  if (cur.length > 1 || cur[0] !== "") pushRow();
  return rows.map((r) => r.map((v) => v.trim()));
}
