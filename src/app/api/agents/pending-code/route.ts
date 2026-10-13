import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser, type StaffUser } from "@/lib/session";

const digits = (s: string) => s.replace(/\D/g, "").slice(-10);

// GET /api/agents/pending-code?phone= — owner-only relay for agent login.
// Pre-template-approval, agents can't receive the WhatsApp OTP. The owner
// reads the pending code here and relays it by call/SMS — the code itself is
// a real Better Auth OTP, so verification is unchanged. Owner-only, roster
// match required, every read audited. Codes expire (10 min); never cached.
export async function GET(req: Request) {
  // Strangers get 401 even if the session layer itself throws — never a 500.
  let u: StaffUser | null = null;
  try {
    u = await getStaffUser();
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (u.role !== "owner" && u.role !== "admin")
    return NextResponse.json({ ok: false }, { status: 403 });
  if (!u.agencyId) return NextResponse.json({ ok: false }, { status: 403 });

  const phone = new URL(req.url).searchParams.get("phone")?.trim() ?? "";
  if (digits(phone).length < 7)
    return NextResponse.json({ ok: false, error: "Add the agent's number." }, { status: 400 });

  // Must be on this owner's roster — no fishing for strangers' codes.
  const roster = await prisma.agent.findMany({
    where: { agencyId: u.agencyId, active: true },
    select: { phone: true, fullName: true },
  });
  const match = roster.find((a) => digits(a.phone) === digits(phone));
  if (!match)
    return NextResponse.json({ ok: false, error: "That number isn't on your roster." }, { status: 404 });

  // Better Auth stores phone OTPs as verification rows: identifier = the
  // number as typed, value = "<code>:<attempts>". Match on digit suffix —
  // the agent may have typed +234… while the roster holds 0803….
  const rows = await prisma.verification.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const hit = rows.find((r) => digits(r.identifier) === digits(phone));
  if (!hit)
    return NextResponse.json(
      { ok: false, error: "No code waiting — ask them to tap “WhatsApp me the code” first, then read it here." },
      { status: 404 }
    );
  const [code] = hit.value.split(":");
  await audit({ actor: u.id, entity: "agent", entityId: match.fullName, action: "relay-login-code", diff: { phone: digits(phone) } });
  return NextResponse.json({ ok: true, name: match.fullName, code, expiresAt: hit.expiresAt });
}
