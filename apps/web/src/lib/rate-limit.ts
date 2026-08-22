import "server-only";
import { redis } from "./redis";

// Fixed-window limiter on the existing Redis client — no new dependency. Shared by both
// the web (NextAuth authorize / Server Actions) and API (Route Handler) entry points, keyed
// identically, so an attacker can't reset their budget by switching client.
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const full = `rl:${key}`;
  const count = await redis().incr(full);
  if (count === 1) await redis().expire(full, windowSeconds);
  return count <= limit;
}

/** Throws (message starts with "Too many" — mapped to HTTP 429 by the API handler) when the limit is exceeded. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const ok = await checkRateLimit(key, limit, windowSeconds);
  if (!ok) throw new Error("Too many attempts. Try again in a few minutes.");
}
