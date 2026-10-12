import { describe, it, expect } from "vitest";
import { askGuide, type CardFacts } from "./guide";

const facts: CardFacts = {
  title: "3-bedroom apartment",
  area: "Gwarinpa, Abuja",
  price: "4000000",
  currency: "NGN",
  lastConfirmedAt: new Date().toISOString(),
  photographedAt: null,
  agencyName: "BrightHomes",
  agencyContact: "+2348000000000",
  host: "Emeka",
  bookable: true,
  paused: false,
  slots: [{ startsAt: new Date(Date.now() + 864e5).toISOString(), left: 2 }],
  policy: "Free viewing.",
  freshBadge: null,
};

describe("askGuide", () => {
  it("answers price only from the record", async () => {
    const a = await askGuide(facts, "How much is the rent?");
    expect(a.answer).toMatch(/4,000,000/);
    expect(a.answer).toMatch(/never pay anyone before/);
  });

  it("never claims title, ownership, or safety", async () => {
    for (const q of ["Is the title genuine?", "Is it safe?", "Who owns it?"]) {
      const a = await askGuide(facts, q);
      expect(a.answer).toMatch(/won't guess|can't confirm/i);
      expect(a.escalate).toBe(true);
      expect(a.answer).not.toMatch(/genuine|verified|safe\b.*yes/i);
    }
  });

  it("admits ignorance instead of inventing", async () => {
    const a = await askGuide(facts, "Does it have a swimming pool and a helipad?");
    expect(a.answer).toMatch(/don't have a confirmed answer/);
    expect(a.answer).toMatch(/\+2348000000000/);
  });

  it("reflects paused state honestly", async () => {
    const a = await askGuide({ ...facts, bookable: false, paused: true }, "Is it still available?");
    expect(a.answer).toMatch(/Not right now/);
  });
});
