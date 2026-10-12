import { describe, it, expect, vi, beforeEach } from "vitest";
import { freshScore } from "./fresh";
import { prisma } from "./db";

vi.mock("./db", () => ({ prisma: {
  listing: { findMany: vi.fn() },
  booking: { count: vi.fn() },
  issue: { count: vi.fn() },
  agency: { findUnique: vi.fn() },
} }));

const mocked = prisma as unknown as {
  listing: { findMany: ReturnType<typeof vi.fn> };
  booking: { count: ReturnType<typeof vi.fn> };
  issue: { count: ReturnType<typeof vi.fn> };
  agency: { findUnique: ReturnType<typeof vi.fn> };
};

beforeEach(() => vi.resetAllMocks());

describe("freshScore", () => {
  it("refuses to score under 5 viewings", async () => {
    mocked.listing.findMany.mockResolvedValue([]);
    mocked.booking.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    mocked.issue.count.mockResolvedValue(0);
    const s = await freshScore("a1");
    expect(s.score).toBeNull();
    expect(s.badge).toMatch(/Too new/);
  });

  it("scores perfect honesty at 100", async () => {
    const now = new Date();
    mocked.listing.findMany.mockResolvedValue([
      { status: "Active", lastConfirmedAt: now },
      { status: "Active", lastConfirmedAt: now },
    ]);
    mocked.booking.count.mockResolvedValueOnce(10).mockResolvedValueOnce(0);
    mocked.issue.count.mockResolvedValue(0);
    mocked.agency.findUnique.mockResolvedValue({ refreshIntervalDays: 14 });
    const s = await freshScore("a1");
    expect(s.score).toBe(100);
    expect(s.viewings).toBe(10);
  });

  it("punishes no-shows and mismatches", async () => {
    const now = new Date();
    mocked.listing.findMany.mockResolvedValue([{ status: "Active", lastConfirmedAt: now }]);
    mocked.booking.count.mockResolvedValueOnce(6).mockResolvedValueOnce(6);
    mocked.issue.count.mockResolvedValue(4);
    mocked.agency.findUnique.mockResolvedValue({ refreshIntervalDays: 14 });
    const s = await freshScore("a1");
    expect(s.score).toBeLessThan(70);
  });
});
