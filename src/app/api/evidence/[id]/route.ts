import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";

const Review = z.object({
  action: z.enum(["accept", "reject"]),
  // OCR draft extraction needs human approval per field; store raw text only.
  ocrText: z.string().max(20000).optional(),
  ocrConfidence: z.coerce.number().min(0).max(1).optional(),
});

// PATCH /api/evidence/[id] — owner/reviewer only. Accept keeps status;
// reject sets listing NeedsReview. Never auto-verifies title/ownership.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.role !== "owner" && u.role !== "reviewer" && u.role !== "admin")
    return NextResponse.json({ ok: false }, { status: 403 });

  const doc = await prisma.evidenceDoc.findFirst({
    where: { id: params.id, listing: { agencyId: agencyScope(u) } },
  });
  if (!doc) return NextResponse.json({ ok: false }, { status: 404 });

  const parsed = Review.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const status = parsed.data.action === "accept" ? "Accepted" : "Rejected";
  const updated = await prisma.evidenceDoc.update({
    where: { id: doc.id },
    data: {
      status: status as never,
      ocrText: parsed.data.ocrText,
      ocrConfidence: parsed.data.ocrConfidence,
      reviewedAt: new Date(),
    },
  });
  if (status === "Rejected") {
    await prisma.listing.update({
      where: { id: doc.listingId },
      data: { status: "NeedsReview" as never },
    });
  }
  await audit({ actor: u.id, entity: "evidence", entityId: doc.id, action: status.toLowerCase(), diff: {} });
  return NextResponse.json({ ok: true, doc: updated });
}
