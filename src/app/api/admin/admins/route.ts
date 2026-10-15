import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/admin";

// Creator-only landlord management. The creator decides who runs shops;
// nobody in any UI can create a superadmin — not even here.
const SetRole = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "admin"]), // "superadmin" deliberately absent
});

// GET — every landlord + the creator (listed, never editable here).
// ?email= looks up any account to promote.
export async function GET(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false }, { status: gate.status });
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (email) {
    const found = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, name: true, role: true, banned: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, people: found ? [found] : [] });
  }
  const people = await prisma.user.findMany({
    where: { role: { in: ["admin", "superadmin"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, banned: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, people });
}

// POST — grant/revoke landlord. Guards: never touch a superadmin,
// never lock out the last one (there is exactly the creator).
export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false }, { status: gate.status });
  const parsed = SetRole.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return NextResponse.json({ ok: false }, { status: 404 });
  if (target.role === "superadmin")
    return NextResponse.json({ ok: false, error: "The creator's role is set nowhere but here." }, { status: 403 });
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
  });
  await audit({ actor: gate.user.id, entity: "user", entityId: target.id, action: `set-role:${parsed.data.role}`, diff: { email: target.email } });
  return NextResponse.json({ ok: true, email: updated.email, role: updated.role });
}
