import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser } from "@/lib/session";

const digits = (s: string) => s.replace(/\D/g, "");

// POST /api/agents/claim — phone-verified user claims their roster spot.
// Matches roster by digits-only phone; sets role=agent + agencyId.
// Without this, agents could sign in but never see or do anything.
export async function POST() {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (!u.phoneNumber)
    return NextResponse.json({ ok: false, error: "Sign in with your WhatsApp number first." }, { status: 400 });
  if (u.agencyId)
    return NextResponse.json({ ok: false, error: "Already linked to an agency." }, { status: 409 });

  const mine = digits(u.phoneNumber);
  const roster = await prisma.agent.findMany({ select: { id: true, agencyId: true, phone: true, publicName: true } });
  const match = roster.find((a) => digits(a.phone) === mine || digits(a.phone) === mine.replace(/^234/, "0") || `234${digits(a.phone).replace(/^0/, "")}` === mine);
  if (!match)
    return NextResponse.json(
      { ok: false, error: "No roster spot matches your number — ask your owner to add you first." },
      { status: 404 }
    );

  await prisma.user.update({ where: { id: u.id }, data: { role: "agent", agencyId: match.agencyId } });
  await audit({ actor: u.id, entity: "agent", entityId: match.id, action: "claim", diff: {} });
  return NextResponse.json({ ok: true, agencyId: match.agencyId, name: match.publicName });
}
