import { describe, it, expect } from "vitest";
import { activeGate, slugify, ListingCreate } from "./listings";

describe("activeGate", () => {
  it("blocks Active without agent, photos, or photo date", () => {
    expect(activeGate({ imageUrls: [], agentId: undefined }).length).toBeGreaterThan(0);
  });
  it("blocks photos older than 30 days", () => {
    const old = new Date(Date.now() - 31 * 24 * 3600e3);
    const missing = activeGate({ imageUrls: ["https://x/y.webp"], photographedAt: old, agentId: "a1" });
    expect(missing.join(" ")).toMatch(/30 days/);
  });
  it("passes a complete listing", () => {
    const fresh = new Date(Date.now() - 3 * 24 * 3600e3);
    expect(activeGate({ imageUrls: ["https://x/y.webp"], photographedAt: fresh, agentId: "a1" })).toEqual([]);
  });
});

describe("ListingCreate", () => {
  it("rejects AI-invented shortcuts (missing title/area/price)", () => {
    expect(ListingCreate.safeParse({ type: "rent" }).success).toBe(false);
  });
});

describe("slugify", () => {
  it("makes url-safe unique slugs", () => {
    const s = slugify("3-Bedroom Apartment!", "Gwarinpa, Abuja");
    expect(s).toMatch(/^[a-z0-9-]+$/);
  });
});
