import { rateLimitMem } from "./ratelimit-mem";
import { rateLimitRedis } from "./ratelimit-redis";

// Shared rate limiting across serverless instances (async).
// - No Redis configured → memory (pilot default).
// - UPSTASH_REDIS_REST_URL + TOKEN set → shared counters; any Redis
//   failure falls back to memory so limiting never breaks booking.
export async function rateLimit(key: string, max = 20, windowMs = 60_000): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await rateLimitRedis(key, max, windowMs);
    } catch (e) {
      console.warn("[ratelimit] redis failed, memory fallback", (e as Error).message);
    }
  }
  return rateLimitMem(key, max, windowMs);
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
