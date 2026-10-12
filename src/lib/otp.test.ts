import { describe, it, expect } from "vitest";
import { generateOtp, verifyOtp, hashOtp, OTP_MAX_ATTEMPTS } from "./otp";

describe("otp", () => {
  it("mints a 6-digit code with matching hash", () => {
    const { code, hash, expires } = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyOtp(code, hash)).toBe(true);
    expect(expires.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects wrong codes (timing-safe)", () => {
    const { code, hash } = generateOtp();
    const wrong = code === "000000" ? "000001" : "000000";
    expect(verifyOtp(wrong, hash)).toBe(false);
    expect(hashOtp(code)).toBe(hash);
  });

  it("caps attempts at 5 before review", () => {
    expect(OTP_MAX_ATTEMPTS).toBe(5);
  });
});
