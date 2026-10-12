import type { CardFacts, GuideAnswer } from "./guide";

// AI smile, rule backbone: Gemini first, OpenRouter-free second, rules always.
// Every LLM answer passes grounding guards before reaching a buyer:
//  - banned claim words (verified/genuine/guaranteed/...) → discarded
//  - any ₦ amount not equal to the record price → discarded
//  - error / 429 / timeout → next provider, then rules
// Title & legal questions never reach any model (deflected upstream).

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const BANNED = [/verif/i, /genuine/i, /guarante/i, /title is valid/i, /\bsafe\b.*(yes|100%|guarante)/i, /fraud.{0,20}detect/i];

function systemPrompt(f: CardFacts): string {
  const slots = f.slots.filter((s) => s.left > 0).slice(0, 3)
    .map((s) => new Date(s.startsAt).toLocaleString()).join("; ") || "none right now";
  return [
    "You are the ViewProof assistant: warm, brief, plain Nigerian English. Max 60 words.",
    "Answer ONLY from these FACTS. If it is not here, say you don't have a confirmed answer and point to the agency.",
    "NEVER claim title, ownership, verification, legality, or safety. NEVER invent prices, dates, or addresses.",
    `FACTS: ${f.title} in ${f.area}; rent ${f.currency} ${f.price}; refreshed ${f.lastConfirmedAt}; host ${f.host ?? "unassigned"} (${f.agencyName}, ${f.agencyContact}); open times: ${slots}; bookable: ${f.bookable}; policy: ${f.policy || "free viewing"}.`,
  ].join("\n");
}

function guarded(facts: CardFacts, text: string, fallback: GuideAnswer): GuideAnswer {
  const t = text.trim().slice(0, 600);
  if (!t) return fallback;
  if (BANNED.some((re) => re.test(t))) return fallback;
  // Any naira figure must be the record price — else it's invention.
  const record = Number(facts.price.replace(/[^0-9.]/g, ""));
  const amounts = Array.from(t.matchAll(/₦\s?([\d,]+)/g)).map((m) => Number(m[1].replace(/,/g, "")));
  if (amounts.some((a) => a !== record)) return fallback;
  return { answer: t, escalate: fallback.escalate };
}

async function chat(url: string, headers: Record<string, string>, model: string, system: string, question: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 180,
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`llm ${res.status}`);
  const j = await res.json();
  const text = j?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("llm empty");
  return text;
}

export type LlmConfig = {
  geminiKey?: string;
  geminiModel?: string;
  openrouterKey?: string;
  openrouterModel?: string;
  siteUrl?: string;
};

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  return {
    geminiKey: env.GEMINI_API_KEY || undefined,
    geminiModel: env.AI_GUIDE_GEMINI_MODEL || "gemini-3.8-flash",
    openrouterKey: env.OPENROUTER_API_KEY || undefined,
    openrouterModel: env.AI_GUIDE_OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
    siteUrl: env.SITE_URL || undefined,
  };
}

/** Full chain: Gemini → OpenRouter → rule fallback. Never throws, never invents. */
export async function llmGuide(
  facts: CardFacts,
  question: string,
  fallback: GuideAnswer,
  cfg: LlmConfig = configFromEnv()
): Promise<GuideAnswer> {
  const system = systemPrompt(facts);
  if (cfg.geminiKey) {
    try {
      const text = await chat(
        GEMINI_URL,
        { Authorization: `Bearer ${cfg.geminiKey}` },
        cfg.geminiModel ?? "gemini-3.8-flash",
        system,
        question
      );
      return guarded(facts, text, fallback);
    } catch (e) {
      console.warn("[guide] gemini failed, trying openrouter", (e as Error).message);
    }
  }
  if (cfg.openrouterKey) {
    try {
      const text = await chat(
        OPENROUTER_URL,
        {
          Authorization: `Bearer ${cfg.openrouterKey}`,
          ...(cfg.siteUrl ? { "HTTP-Referer": cfg.siteUrl, "X-Title": "ViewProof" } : {}),
        },
        cfg.openrouterModel ?? "meta-llama/llama-3.1-8b-instruct:free",
        system,
        question
      );
      return guarded(facts, text, fallback);
    } catch (e) {
      console.warn("[guide] openrouter failed, using rules", (e as Error).message);
    }
  }
  return fallback;
}
