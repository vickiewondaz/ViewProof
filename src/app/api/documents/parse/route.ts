import { NextResponse } from "next/server";
import { getStaffUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { detectShape } from "@/lib/docparse";

export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

// POST /api/documents/parse — staff-only. Upload a file, get back its shape:
// TABLE (headers + rows, mapped toward listing import) or TEXT (preview).
// csv/txt/md read directly; PDF via text layer; photos via on-device-style
// OCR (tesseract, English). Scanned-image PDFs with no text layer come back
// honest: { ocr: "empty" } instead of hallucinated rows.
export async function POST(req: Request) {
  const u = await getStaffUser().catch(() => null);
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (!u.agencyId) return NextResponse.json({ ok: false }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || file.size === 0)
    return NextResponse.json({ ok: false, error: "Choose a file first." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ ok: false, error: "5MB max — snap closer or split the file." }, { status: 413 });

  const name = (form?.get("name") as string) || "document";
  const mime = file.type || guessMime(name);
  const buf = Buffer.from(await file.arrayBuffer());

  let text = "";
  let ocr: string | undefined;
  try {
    if (mime === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buf });
      const data = await parser.getText();
      text = (data.text ?? "").trim();
      await parser.destroy().catch(() => null);
      if (!text) ocr = "empty"; // scanned images, no text layer
    } else if (mime.startsWith("image/")) {
      text = await ocrImage(buf);
      if (!text) ocr = "empty";
      else ocr = "photo";
    } else {
      text = buf.toString("utf8").slice(0, 200_000);
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Couldn't read that file — try CSV, plain text, or a clearer photo." },
      { status: 422 }
    );
  }

  const shape = detectShape(text);
  await audit({ actor: u.id, entity: "document", entityId: name, action: "parse", diff: { kind: shape.kind } });
  return NextResponse.json({ ok: true, name, shape, ocr, chars: text.length });
}

function guessMime(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".csv")) return "text/csv";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  return "text/plain";
}

async function ocrImage(buf: Buffer): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const job = worker.recognize(buf);
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 45_000));
    const res = await Promise.race([job, timeout]);
    if (!res) return "";
    return (res.data.text ?? "").trim();
  } finally {
    await worker.terminate().catch(() => null);
  }
}
