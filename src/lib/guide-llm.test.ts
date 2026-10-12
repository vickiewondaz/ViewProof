import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { llmGuide } from "./guide-llm";
import type { CardFacts, GuideAnswer } from "./guide";

const facts: CardFacts = {
  title: "Flat", area: "Lekki", price: "4000000", currency: "NGN",
  lastConfirmedAt: new Date().toISOString(), photographedAt: null,
  agencyName: "A", agencyContact: "+2341", host: "Emeka",
  bookable: true, paused: false, slots: [], policy: "", freshBadge: null,
};
const fallback: GuideAnswer = { answer: "RULE", escalate: true };

const ok = (text: string) =>
  Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 }));

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("llmGuide", () => {
  it("uses Gemini when healthy", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(await ok("Yes 🙂 refreshed recently."));
    const a = await llmGuide(facts, "Available?", fallback, { geminiKey: "g" });
    expect(a.answer).toMatch(/refreshed/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to OpenRouter on Gemini 429", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(new Response("limited", { status: 429 }))
      .mockResolvedValueOnce(await ok("OpenRouter says hi."));
    const a = await llmGuide(facts, "Hi?", fallback, { geminiKey: "g", openrouterKey: "o" });
    expect(a.answer).toMatch(/OpenRouter/);
  });

  it("discards invented prices", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(await ok("Only ₦9,999,999 today!"));
    const a = await llmGuide(facts, "Price?", fallback, { geminiKey: "g" });
    expect(a).toEqual(fallback);
  });

  it("discards verification claims", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(await ok("100% verified genuine title!"));
    const a = await llmGuide(facts, "Title?", fallback, { geminiKey: "g" });
    expect(a).toEqual(fallback);
  });

  it("serves rules with no keys", async () => {
    const a = await llmGuide(facts, "Hi?", fallback, {});
    expect(a).toEqual(fallback);
    expect(fetch).not.toHaveBeenCalled();
  });
});
