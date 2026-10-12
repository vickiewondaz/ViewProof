// Guided support layer: friendly answers grounded ONLY in the approved
// listing record. This is the AI-ready seam — `GuideProvider` can later be
// fulfilled by an LLM (e.g. Neon AI Gateway) behind the same contract, but
// the contract forbids invention: unknown → honest fallback + human handoff.
// Truth rules enforced in code, not in prompts.

export type CardFacts = {
  title: string;
  area: string;
  price: string;
  currency: string;
  lastConfirmedAt: string;
  photographedAt: string | null;
  agencyName: string;
  agencyContact: string;
  host: string | null;
  bookable: boolean;
  paused: boolean;
  slots: { startsAt: string; left: number }[];
  policy: string;
  freshBadge: string | null;
};

export type GuideAnswer = { answer: string; escalate: boolean };

type Provider = (facts: CardFacts, question: string) => Promise<GuideAnswer> | GuideAnswer;

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

function ruleProvider(f: CardFacts, question: string): GuideAnswer {
  const q = question.toLowerCase();
  const when = new Date(f.lastConfirmedAt).toDateString();

  if (has(q, "title", "cofo", "cof o", "c of o", "ownership", "document", "deed", "legal", "genuine", "safe", "fraud", "scam", "owns", "owned", "owner", "own ", "landlord")) {
    return {
      answer: `I can't confirm that, and I won't guess. ViewProof doesn't verify title or ownership. Ask ${f.agencyName} directly about their due-diligence process — a person there will walk you through it.`,
      escalate: true,
    };
  }
  if (has(q, "available", "still there", "taken", "fresh", "current", "stale", "paused")) {
    return f.bookable
      ? { answer: `Yes, as far as we know 🙂 ${f.agencyName} last confirmed it on ${when}. Booking is open — pick a time below and it's yours to visit, free.`, escalate: false }
      : { answer: `Not right now — the agency hasn't reconfirmed it, so booking is paused to save you a wasted trip. Ping them on WhatsApp and they'll tell you the moment it's fresh.`, escalate: true };
  }
  if (has(q, "price", "cost", "rent", "much", "fee", "charge", "pay")) {
    return {
      answer: `Listed at ${f.currency} ${Number(f.price).toLocaleString()}. Bookings and viewings are always free — never pay anyone before you've met and seen the place.`,
      escalate: false,
    };
  }
  if (has(q, "who", "host", "agent", "meet", "contact", "number", "call")) {
    return {
      answer: f.host
        ? `You'll meet ${f.host} from ${f.agencyName} (${f.agencyContact}). A named person, every time — no strangers.`
        : `The hosting agent isn't assigned yet — ${f.agencyName} (${f.agencyContact}) will confirm who meets you before your visit.`,
      escalate: !f.host,
    };
  }
  if (has(q, "book", "visit", "see", "time", "slot", "when", "how", "appointment", "schedule")) {
    const open = f.slots.filter((s) => s.left > 0).slice(0, 3)
      .map((s) => new Date(s.startsAt).toLocaleString()).join("; ");
    return {
      answer: open
        ? `Easy! Pick a time right on this card — e.g. ${open}. Your code arrives on WhatsApp, you show it at the venue. Free, no account.`
        : `No open times at the moment. Use "Notify me" and we'll WhatsApp you the second new times appear.`,
      escalate: !open,
    };
  }
  if (has(q, "where", "location", "area", "address", "direction", "locate")) {
    return {
      answer: `It's in ${f.area}. The exact meeting point arrives with your booking confirmation — that keeps everyone's address private until there's a real appointment.`,
      escalate: false,
    };
  }
  if (has(q, "cancel", "reschedule", "change", "refund", "policy")) {
    return {
      answer: `No wahala. Cancel free from your Viewing Pass, or just reply CANCEL on WhatsApp. ${f.policy || "The agency's policy is on the card."}`,
      escalate: false,
    };
  }
  return {
    answer: `Hmm, I don't have a confirmed answer for that yet — and I'd rather say so than guess 🙂 I've noted it for ${f.agencyName}, and a person there (${f.agencyContact}) will answer you directly on WhatsApp.`,
    escalate: true,
  };
}

let provider: Provider = ruleProvider;

/** Swap in an LLM provider later (AI Gateway). Same contract: grounded or honest. */
export function setGuideProvider(p: Provider) {
  provider = p;
}

export function askGuide(facts: CardFacts, question: string): Promise<GuideAnswer> | GuideAnswer {
  if (!question.trim()) return { answer: "Ask me anything about this place — price, times, who you'll meet. 🙂", escalate: false };
  return provider(facts, question.slice(0, 500));
}
