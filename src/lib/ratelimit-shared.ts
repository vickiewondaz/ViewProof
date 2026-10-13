import { rateLimit as memoryLimit } from "./ratelimit-mem";
import { rateLimitRedis } from "./ratelimit-redis";

// Shared rate limiting that survives multiple serverless instances.
// - Default: in-memory (fine for pilot; zero deps).
// - Scale: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN and every
//   instance shares one counter. No code changes at call sites.
export async function rateLimitShared(key: string, max = 20, windowMs = 60_000): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await rateLimitRedis(key, max, windowMs);
    } catch (e) {
      console.warn("[ratelimit] redis failed, falling back to memory", e);
    }
  }
  return memoryLimit(key, max, windowMs);
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
