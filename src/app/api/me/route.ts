import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// GET /api/me — who am I (agency scoping for push subscribe, agent UI).
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });
  const u = session.user as { id: string; email: string; role?: string | null; agencyId?: string | null };
  return NextResponse.json({
    ok: true,
    user: { id: u.id, email: u.email, role: u.role ?? null, agencyId: u.agencyId ?? null },
  });
}
