import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const Ban = z.object({
  email: z.string().email(),
  reason: z.string().max(280).optional(),
  unban: z.boolean().optional(),
});

// POST /api/admin/users/ban — lock a troublemaker's account by email.
// Ban blocks sign-in + kills sessions (Better Auth admin plugin).
// Prefer suspending their agency; ban people only for abuse.
export async function POST(req: Request) {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false }, { status: gate.status });
  const parsed = Ban.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!target) return NextResponse.json({ ok: false, error: "No account with that email." }, { status: 404 });
  if (target.role === "admin")
    return NextResponse.json({ ok: false, error: "Admin accounts can't be banned from here." }, { status: 403 });

  const h = await headers();
  if (parsed.data.unban) {
    await auth.api.unbanUser({ body: { userId: target.id }, headers: h });
  } else {
    await auth.api.banUser({
      body: { userId: target.id, banReason: parsed.data.reason || "Suspended by platform support" },
      headers: h,
    });
  }
  await audit({
    actor: gate.user.id,
    entity: "user",
    entityId: target.id,
    action: parsed.data.unban ? "unban" : "ban",
    diff: { email: target.email },
  });
  return NextResponse.json({ ok: true });
}
