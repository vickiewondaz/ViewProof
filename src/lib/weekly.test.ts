import { describe, it, expect } from "vitest";
import { formatWeeklyText } from "./weekly";

const base = {
  weekStarting: new Date().toISOString(),
  listings: { Active: 5, StalePaused: 2 },
  bookings: { Completed: 9, Confirmed: 3, Requested: 1 },
  issues: {},
  attendance: [{ agent: "Emeka", assigned: 6, attended: 5 }],
};

describe("formatWeeklyText", () => {
  it("states observable numbers, no hype", () => {
    const t = formatWeeklyText("BrightHomes", base);
    expect(t).toMatch(/9 viewing\(s\) completed, 4 upcoming/);
    expect(t).toMatch(/5 live listings, 2 paused as stale/);
    expect(t).toMatch(/Emeka: 5\/6 attended/);
    expect(t).not.toMatch(/growth|amazing|verified/i);
  });
  it("flags open issues plainly", () => {
    const t = formatWeeklyText("B", { ...base, issues: { price: 2 } });
    expect(t).toMatch(/2 buyer issue\(s\) need your eyes/);
  });
});
