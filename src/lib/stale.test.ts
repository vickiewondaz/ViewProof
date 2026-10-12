import { describe, it, expect } from "vitest";
import { isStale, buildEvidence } from "./stale";

describe("isStale", () => {
  it("flags listings past the refresh interval", () => {
    const old = new Date(Date.now() - 15 * 24 * 3600e3);
    expect(isStale(old, 14)).toBe(true);
  });
  it("keeps fresh listings bookable", () => {
    const fresh = new Date(Date.now() - 2 * 24 * 3600e3);
    expect(isStale(fresh, 14)).toBe(false);
  });
});

describe("buildEvidence", () => {
  it("never claims title verification", () => {
    const labels = buildEvidence({
      agentName: "Emeka",
      lastConfirmedAt: new Date(),
      photographedAt: new Date(),
      accessRef: "KEY-1",
      status: "Active",
    }).map((e) => e.label);
    expect(labels).toContain("Title and ownership not checked by ViewProof");
    expect(labels).not.toContain("Verified Property");
  });
  it("marks stale/paused as needing confirmation", () => {
    const labels = buildEvidence({
      lastConfirmedAt: new Date(),
      status: "StalePaused",
    }).map((e) => e.label);
    expect(labels).toContain("Needs confirmation");
  });
});
