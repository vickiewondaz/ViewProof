import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Sub = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  agencyId: z.string().optional(),
  agentId: z.string().optional(),
});

// POST /api/push — store PWA subscription (agent booking alerts).
// Fan-out runs on booking create (notifyAgency); WhatsApp stays primary.
export async function POST(req: Request) {
  const parsed = Sub.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  await prisma.pushSub.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: parsed.data,
    update: { keys: parsed.data.keys as object, agencyId: parsed.data.agencyId, agentId: parsed.data.agentId },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
