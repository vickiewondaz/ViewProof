// Upstash Redis sliding window via REST (no SDK). Throws on any failure
// so callers fall back to memory — limiting must never break booking.
const LUA = `local c=redis.call('ZCARD',KEYS[1]) if c>=tonumber(ARGV[3]) then return 0 end redis.call('ZADD',KEYS[1],ARGV[1],ARGV[1]..'-'..ARGV[4]) redis.call('ZREMRANGEBYSCORE',KEYS[1],0,ARGV[1]-ARGV[2]) redis.call('EXPIRE',KEYS[1],math.ceil(ARGV[2]/1000)+1) return 1`;

export async function rateLimitRedis(key: string, max = 20, windowMs = 60_000): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("redis not configured");
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  const endpoint = `${url.replace(/\/$/, "")}/eval/${encodeURIComponent(LUA)}/1/${encodeURIComponent(`ratelimit:${key}`)}/${Date.now()}/${windowMs}/${max}/${encodeURIComponent(nonce)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const j = await res.json();
  return j?.result === 1;
}
