import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { getStaffUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/ratelimit";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

// POST /api/uploads — staff-only image upload to Netlify Blobs.
// Client compresses to WebP ≤800KB + strips GPS first (PWA); server enforces
// 5MB cap + image MIME. Returns { url } for listings/evidence/issues.
// Works on Netlify (blobs bound automatically). Locally needs NETLIFY
// siteID/token — otherwise returns 503 with a human message.
export async function POST(req: Request) {
  const u = await getStaffUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "evidence");
  // Buyers (no account) may attach photos to issue reports only — rate-limited.
  // Staff kinds (evidence/listing) require sign-in.
  if (!u) {
    if (kind !== "issues")
      return NextResponse.json({ ok: false }, { status: 401 });
    if (!rateLimit(`uploads:${clientKey(req)}`, 10))
      return NextResponse.json({ ok: false, error: "Too many photos — try later." }, { status: 429 });
  }
  if (!(file instanceof Blob))
    return NextResponse.json({ ok: false, error: "Choose a photo first." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ ok: false, error: "Photo too big — 5MB max. Try retaking closer." }, { status: 413 });
  if (file.type && !ALLOWED.has(file.type))
    return NextResponse.json({ ok: false, error: "Only JPG, PNG or WebP photos." }, { status: 415 });

  try {
    const store = getStore("viewproof-images");
    const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
    const key = `${kind}/${u?.id ?? "buyer"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await store.set(key, file);
    const url = `/api/uploads?key=${encodeURIComponent(key)}`;
    await audit({ actor: u?.id ?? "buyer", entity: "upload", entityId: key, action: "upload", diff: { kind } });
    return NextResponse.json({ ok: true, url, key }, { status: 201 });
  } catch (e) {
    console.warn("[uploads] blob store unavailable", e);
    return NextResponse.json(
      { ok: false, error: "Uploads need the live site — this preview can't store photos yet." },
      { status: 503 }
    );
  }
}

// GET /api/uploads?key= — serves a stored image (public; cards need it).
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key.includes("..")) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const store = getStore("viewproof-images");
    const blob = await store.get(key, { type: "blob" });
    if (!blob) return NextResponse.json({ ok: false }, { status: 404 });
    const ct = key.endsWith(".png") ? "image/png" : key.endsWith(".jpg") ? "image/jpeg" : "image/webp";
    return new NextResponse(blob, {
      headers: {
        "Content-Type": blob.type || ct,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
