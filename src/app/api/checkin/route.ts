import { NextResponse } from "next/server";
import { z } from "zod";

const CheckinInput = z.object({
  bookingId: z.string(),
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit code from your Viewing Pass."),
});

// TODO Phase 4: agent-only, verify hash/window/attempts, write receipt, WhatsApp receipt.
export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = CheckinInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, stub: true }, { status: 501 });
}
