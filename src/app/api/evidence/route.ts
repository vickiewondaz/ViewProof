import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";

const Upload = z.object({
  listingId: z.string(),
  kind: z.enum(["mandate", "photo", "letter", "receipt", "other"]).default("photo"),
  // MVP: client uploads bytes to storage first (Netlify Blobs/S3), sends URL.
  // PWA compresses to WebP ≤800KB + strips GPS before upload.
  imageUrl: z.string().url().max(2000),
  // Optional sha256 of the bytes (client-computed) — better duplicate
  // detection than the URL hash fallback below.
  hash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  takenAt: z.coerce.date().optional(),
});

// POST /api/evidence — in-app camera only (no gallery in MVP), always Pending.
// Duplicate hash across listings → auto-flag NeedsReview on the listing.
export async function POST(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = Upload.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const listing = await prisma.listing.findFirst({
    where: { id: parsed.data.listingId, agencyId: agencyScope(u) },
  });
  if (!listing) return NextResponse.json({ ok: false }, { status: 404 });

  const hash = parsed.data.hash ?? createHash("sha256").update(parsed.data.imageUrl).digest("hex");
  const dup = await prisma.evidenceDoc.findFirst({
    where: { hash, listingId: { not: listing.id } },
    select: { id: true, listingId: true },
  });

  const doc = await prisma.evidenceDoc.create({
    data: {
      listingId: listing.id,
      kind: parsed.data.kind as never,
      imageUrl: parsed.data.imageUrl,
      hash,
      takenAt: parsed.data.takenAt,
      uploadedBy: u.id,
    },
  });
  await audit({ actor: u.id, entity: "evidence", entityId: doc.id, action: "submit", diff: { kind: doc.kind } });

  if (dup) {
    await prisma.listing.update({ where: { id: listing.id }, data: { status: "NeedsReview" as never } });
    await audit({ actor: "system", entity: "listing", entityId: listing.id, action: "duplicate-evidence-flag", diff: { dupOf: dup.listingId } });
  }
  return NextResponse.json({ ok: true, doc, duplicateOf: dup?.listingId ?? null }, { status: 201 });
}

// GET /api/evidence?listingId= — staff scoped review queue (thumbnails, never public).
export async function GET(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const listingId = new URL(req.url).searchParams.get("listingId");
  const docs = await prisma.evidenceDoc.findMany({
    where: {
      ...(listingId ? { listingId } : {}),
      listing: { agencyId: agencyScope(u) },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, docs });
}
