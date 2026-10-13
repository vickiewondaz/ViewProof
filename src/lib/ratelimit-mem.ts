// In-memory sliding-window limiter (pilot default, zero deps).
// Per-instance only — see ratelimit-shared.ts for the multi-instance path.
const hits = new Map<string, number[]>();

export function rateLimitMem(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= max;
}
