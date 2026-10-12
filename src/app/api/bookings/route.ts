import { NextResponse } from "next/server";
import { z } from "zod";

const BookingInput = z.object({
  listingId: z.string(),
  slotId: z.string(),
  buyerName: z.string().min(2),
  buyerPhone: z.string().min(7),
  idempotencyKey: z.string().optional(),
});

// TODO Phase 3: capacity lock, OTP create, WhatsApp booking_confirm, audit.
export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = BookingInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, stub: true }, { status: 501 });
}
