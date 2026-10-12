// Simple in-memory sliding-window limiter for public POST routes.
// Per-instance only — put a proper store (Upstash/Neon) behind this before scale.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= max;
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
