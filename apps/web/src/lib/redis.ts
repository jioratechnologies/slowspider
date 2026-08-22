import "server-only";
import Redis from "ioredis";

let cached: Redis | null = null;

// Generic ioredis client against REDIS_URL — works with any Redis-compatible provider
// (currently Upstash, via its native protocol over TLS), not tied to a specific vendor SDK.
export function redis(): Redis {
  if (cached) return cached;
  cached = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 3 });
  return cached;
}
