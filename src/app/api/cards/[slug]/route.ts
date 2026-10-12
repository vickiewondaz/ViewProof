import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildEvidence, isStale } from "@/lib/stale";

// Public card payload — structured facts + evidence + slots. No PII:
// agent first/public name only, no internal notes, no buyer data, no exact
// address (area only until agency release point — enforced upstream).
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    include: {
      agency: true,
      agent: { select: { publicName: true, fullName: true } },
      slots: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 12,
      },
    },
  });
  if (!listing || listing.status === "Draft" || listing.status === "Archived")
    return NextResponse.json({ ok: false }, { status: 404 });

  const stale = isStale(listing.lastConfirmedAt, listing.agency.refreshIntervalDays);
  const bookable = listing.status === "Active" && !stale;
  const agentName = listing.agent?.publicName ?? listing.agent?.fullName?.split(" ")[0] ?? null;

  return NextResponse.json({
    ok: true,
    card: {
      slug: listing.slug,
      title: listing.title,
      type: listing.type,
      area: listing.area,
      price: listing.price.toString(),
      currency: listing.currency,
      images: listing.imageUrls,
      photographedAt: listing.photographedAt,
      lastConfirmedAt: listing.lastConfirmedAt,
      stale,
      bookable,
      paused: stale || listing.status !== "Active",
      status: stale ? "StalePaused" : listing.status,
      agency: { name: listing.agency.name, contact: listing.agency.contactPublic },
      host: agentName,
      evidence: buildEvidence({
        agentName,
        lastConfirmedAt: listing.lastConfirmedAt,
        photographedAt: listing.photographedAt,
        accessRef: listing.accessRef,
        status: stale ? "StalePaused" : listing.status,
      }),
      slots: listing.slots.map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        left: s.capacity - s.bookedCount,
        requiresConfirmation: !bookable,
      })),
      policy: listing.agency.policyText,
      disclaimer: "ViewProof has not verified title or ownership.",
    },
  });
}
