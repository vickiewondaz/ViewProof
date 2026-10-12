import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { askGuide } from "@/lib/guide";
import { llmGuide } from "@/lib/guide-llm";

const Ask = z.object({
  slug: z.string().min(1).max(160),
  question: z.string().min(1).max(500),
});

// POST /api/assist — guided answers about ONE card, grounded in its record.
// Public + rate-limited. Never invents; unknown → human handoff.
export async function POST(req: Request) {
  if (!rateLimit(`assist:${clientKey(req)}`, 30))
    return NextResponse.json({ ok: false, error: "Slow down a little — ask again in a minute." }, { status: 429 });
  const parsed = Ask.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { slug: parsed.data.slug },
    include: {
      agency: true,
      agent: { select: { publicName: true, fullName: true } },
      slots: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 6 },
    },
  });
  if (!listing || listing.status === "Draft" || listing.status === "Archived" || listing.agency.status === "Suspended")
    return NextResponse.json({ ok: false }, { status: 404 });

  const host = listing.agent?.publicName ?? listing.agent?.fullName?.split(" ")[0] ?? null;
  const facts = {
    title: listing.title,
    area: listing.area,
    price: listing.price.toString(),
    currency: listing.currency,
    lastConfirmedAt: listing.lastConfirmedAt.toISOString(),
    photographedAt: listing.photographedAt?.toISOString() ?? null,
    agencyName: listing.agency.name,
    agencyContact: listing.agency.contactPublic,
    host,
    bookable: listing.status === "Active",
    paused: listing.status !== "Active",
    slots: listing.slots.map((s) => ({ startsAt: s.startsAt.toISOString(), left: s.capacity - s.bookedCount })),
    policy: listing.agency.policyText,
    freshBadge: null,
  };
  // Rules first (always correct), then Gemini → OpenRouter to warm the words.
  // Guards discard any invention; failures serve the rule answer silently.
  const rule = await askGuide(facts, parsed.data.question);
  const answer = await llmGuide(facts, parsed.data.question, rule);
  return NextResponse.json({ ok: true, ...answer });
}
