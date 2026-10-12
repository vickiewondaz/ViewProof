import { NextResponse } from "next/server";

// TODO Phase 2: public ISR card payload (facts + evidence + slots, no PII).
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  return NextResponse.json({ ok: true, slug: params.slug, stub: true });
}
