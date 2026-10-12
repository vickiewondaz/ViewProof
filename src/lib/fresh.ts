import { prisma } from "./db";

export type FreshScore = {
  score: number | null; // null = too new to score honestly
  viewings: number;
  parts: { freshness: number; attendance: number; accuracy: number };
  badge: string;
};

// Fresh Score: an agency's observed honesty, 0–100. Computed ONLY from what
// happened — refresh discipline, showing up, and mismatch rate. Never judged
// by a human, never for sale. Needs ≥5 completed viewings or we say so.
export async function freshScore(agencyId: string): Promise<FreshScore> {
  const [listings, completed, noShows, issues] = await Promise.all([
    prisma.listing.findMany({
      where: { agencyId, status: { in: ["Active", "StalePaused"] as never } },
      select: { status: true, lastConfirmedAt: true },
    }),
    prisma.booking.count({ where: { listing: { agencyId }, status: "Completed" as never } }),
    prisma.booking.count({
      where: { listing: { agencyId }, status: { in: ["NoShowAgent", "NoShowBuyer"] as never } },
    }),
    prisma.issue.count({ where: { listing: { agencyId } } }),
  ]);

  if (completed < 5) {
    return { score: null, viewings: completed, parts: { freshness: 0, attendance: 0, accuracy: 0 }, badge: "Too new to score — check back after a few viewings." };
  }

  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  const intervalMs = (agency?.refreshIntervalDays ?? 14) * 24 * 3600e3;
  const fresh = listings.filter((l) => Date.now() - l.lastConfirmedAt.getTime() <= intervalMs).length;
  const freshness = listings.length ? fresh / listings.length : 1;
  const attended = completed + noShows === 0 ? 1 : completed / (completed + noShows);
  const accuracy = Math.max(0, 1 - issues / Math.max(1, completed));

  const score = Math.round(100 * (0.4 * freshness + 0.4 * attended + 0.2 * accuracy));
  const badge =
    score >= 85 ? `Fresh Score ${score} · top of the market 🌟` :
    score >= 65 ? `Fresh Score ${score} · solid and steady` :
    `Fresh Score ${score} · improving — watch this space`;
  return { score, viewings: completed, parts: { freshness, attendance: attended, accuracy }, badge };
}
