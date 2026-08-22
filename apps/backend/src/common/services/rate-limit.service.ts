import { Injectable } from "@nestjs/common";
import { RedisService } from "./redis.service";

// Port of apps/web's src/lib/rate-limit.ts — fixed-window limiter on the same Redis
// instance/keys, so a client can't reset its budget by switching between apps/web and this
// backend during the parallel-run phase.
@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const full = `rl:${key}`;
    const count = await this.redis.client().incr(full);
    if (count === 1) await this.redis.client().expire(full, windowSeconds);
    return count <= limit;
  }

  /** Throws (message starts with "Too many" — mapped to HTTP 429 by AllExceptionsFilter) when the limit is exceeded. */
  async enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
    const ok = await this.checkRateLimit(key, limit, windowSeconds);
    if (!ok) throw new Error("Too many attempts. Try again in a few minutes.");
  }
}
