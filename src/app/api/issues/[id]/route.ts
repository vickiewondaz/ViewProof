import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, agencyScope } from "@/lib/session";

const Triage = z.object({
  status: z.enum(["Open", "UnderReview", "Resolved", "Dismissed"]),
});

// PATCH /api/issues/[id] — owner/reviewer only. Human decision required
// before any enforcement; resolving may restore listing to Draft for re-approval.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.role !== "owner" && u.role !== "reviewer" && u.role !== "admin")
    return NextResponse.json({ ok: false }, { status: 403 });

  const issue = await prisma.issue.findFirst({
    where: { id: params.id, listing: { agencyId: agencyScope(u) } },
  });
  if (!issue) return NextResponse.json({ ok: false }, { status: 404 });

  const parsed = Triage.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.issue.update({ where: { id: issue.id }, data: { status: parsed.data.status as never } });
  await audit({ actor: u.id, entity: "issue", entityId: issue.id, action: `triage-${parsed.data.status}`, diff: {} });
  return NextResponse.json({ ok: true, issue: updated });
}
