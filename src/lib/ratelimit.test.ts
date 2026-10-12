import { describe, it, expect } from "vitest";
import { rateLimit } from "./ratelimit";

describe("rateLimit", () => {
  it("allows bursts then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 20; i++) expect(rateLimit(key, 20)).toBe(true);
    expect(rateLimit(key, 20)).toBe(false);
  });
  it("isolates keys", () => {
    expect(rateLimit(`a-${Math.random()}`, 1)).toBe(true);
    expect(rateLimit(`b-${Math.random()}`, 1)).toBe(true);
  });
});
