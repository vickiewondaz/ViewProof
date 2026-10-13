import { describe, it, expect } from "vitest";
import { rateLimitMem } from "./ratelimit-mem";
import { rateLimit } from "./ratelimit";

describe("rateLimitMem", () => {
  it("allows bursts then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 20; i++) expect(rateLimitMem(key, 20)).toBe(true);
    expect(rateLimitMem(key, 20)).toBe(false);
  });
  it("isolates keys", () => {
    expect(rateLimitMem(`a-${Math.random()}`, 1)).toBe(true);
    expect(rateLimitMem(`b-${Math.random()}`, 1)).toBe(true);
  });
});

describe("rateLimit (shared)", () => {
  it("falls back to memory with no Redis configured", async () => {
    const key = `shared-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(await rateLimit(key, 5)).toBe(true);
    expect(await rateLimit(key, 5)).toBe(false);
  });
});
