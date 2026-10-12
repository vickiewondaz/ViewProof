import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Demo seed for the concierge pilot: one agency, two agents, three listings
// (two fresh Active, one StalePaused), plus future slots on the fresh ones.
// Run: DATABASE_URL=... DIRECT_URL=... npm run db:seed
// Safe to re-run: skips when the demo agency already exists.
async function main() {
  const existing = await prisma.agency.findFirst({ where: { name: "BrightHomes Agency" } });
  if (existing) {
    console.log(`seed: demo agency already exists (${existing.id}), skipping`);
    return;
  }

  const agency = await prisma.agency.create({
    data: {
      name: "BrightHomes Agency",
      contactPublic: "+234 800 000 0000",
      areas: ["Gwarinpa, Abuja", "Lekki, Lagos"],
      policyText: "Free viewing. Cancel free up to 2h before. No payment before viewing.",
      refreshIntervalDays: 14,
    },
  });

  const emeka = await prisma.agent.create({
    data: { agencyId: agency.id, fullName: "Emeka Obi", publicName: "Emeka", phone: "+2348000000001", active: true },
  });
  const ada = await prisma.agent.create({
    data: { agencyId: agency.id, fullName: "Ada Eze", publicName: "Ada", phone: "+2348000000002", active: true },
  });

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysAhead = (n: number, h = 11) => {
    const d = new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
    d.setHours(h, 0, 0, 0);
    return d;
  };

  const fresh1 = await prisma.listing.create({
    data: {
      agencyId: agency.id,
      agentId: emeka.id,
      title: "3-bedroom apartment",
      type: "rent",
      area: "Gwarinpa, Abuja",
      price: 4000000,
      currency: "NGN",
      status: "Active",
      lastConfirmedAt: daysAgo(2),
      photographedAt: daysAgo(5),
      imageUrls: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=70&auto=format&fit=crop"],
      features: { beds: 3, baths: 2, serviced: true },
      accessRef: "KEY-GWA-114",
      slug: `3-bedroom-apartment-gwarinpa-demo1`,
    },
  });
  const fresh2 = await prisma.listing.create({
    data: {
      agencyId: agency.id,
      agentId: ada.id,
      title: "2-bedroom flat",
      type: "rent",
      area: "Lekki, Lagos",
      price: 3500000,
      currency: "NGN",
      status: "Active",
      lastConfirmedAt: daysAgo(1),
      photographedAt: daysAgo(3),
      imageUrls: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=70&auto=format&fit=crop"],
      features: { beds: 2, baths: 2 },
      slug: `2-bedroom-flat-lekki-demo1`,
    },
  });
  await prisma.listing.create({
    data: {
      agencyId: agency.id,
      agentId: emeka.id,
      title: "4-bedroom duplex",
      type: "sale",
      area: "Gwarinpa, Abuja",
      price: 120000000,
      currency: "NGN",
      status: "StalePaused",
      lastConfirmedAt: daysAgo(30),
      photographedAt: daysAgo(45),
      imageUrls: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=70&auto=format&fit=crop"],
      slug: `4-bedroom-duplex-gwarinpa-demo1`,
    },
  });

  for (const [listingId, days] of [[fresh1.id, [1, 2, 3]], [fresh2.id, [1, 3]]] as const) {
    for (const d of days) {
      await prisma.slot.create({ data: { listingId, startsAt: daysAhead(d), capacity: 2 } });
    }
  }

  await prisma.auditLog.create({
    data: { actor: "system", entity: "agency", entityId: agency.id, action: "seed", diff: {} },
  });
  console.log(`seed: agency=${agency.id} card1=/c/${fresh1.slug} card2=/c/${fresh2.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
