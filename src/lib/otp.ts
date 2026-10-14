import { createHash, randomInt, timingSafeEqual } from "crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

// Meeting codes live differently from login OTPs: valid from booking until
// 3h after the slot starts (≈1h viewing + 2h grace for late arrivals).
// A Saturday viewing booked on Monday checks in fine. 5 wrong tries still
// flags the booking for review — time-boxing added nothing on top of that.
export function meetingCodeExpiry(slotStartsAt: Date): Date {
  return new Date(slotStartsAt.getTime() + 3 * 60 * 60 * 1000);
}

export function generateOtp(): { code: string; hash: string; expires: Date } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return {
    code,
    hash: hashOtp(code),
    expires: new Date(Date.now() + OTP_TTL_MS),
  };
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtp(code: string, hash: string): boolean {
  const h = hashOtp(code);
  const a = Buffer.from(h, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
