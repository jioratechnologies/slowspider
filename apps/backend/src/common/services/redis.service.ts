import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

// Port of apps/web's src/lib/redis.ts — generic ioredis client against REDIS_URL.
@Injectable()
export class RedisService implements OnModuleDestroy {
  private cached: Redis | null = null;

  client(): Redis {
    if (this.cached) return this.cached;
    this.cached = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 3 });
    return this.cached;
  }

  onModuleDestroy() {
    this.cached?.disconnect();
  }
}
