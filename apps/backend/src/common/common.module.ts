import { Global, Module } from "@nestjs/common";
import { SupabaseService } from "./services/supabase.service";
import { RedisService } from "./services/redis.service";
import { RateLimitService } from "./services/rate-limit.service";
import { StorageService } from "./services/storage.service";
import { EmailService } from "./services/email.service";
import { NatsService } from "./services/nats.service";

// Shared providers used by every feature module — Supabase client factory, Redis client,
// rate limiting, email sending, the storage abstraction, and the NATS live-sync publisher
// (Phase 5). @Global() so feature modules don't each need to re-import it (mirrors how
// apps/web's src/lib/{db,redis,rate-limit,email}.ts are just imported wherever needed, no DI
// wiring required there). EmailService lives here rather than in AuthModule specifically to
// avoid a AuthModule <-> WorkspaceModule import cycle (WorkspaceService.inviteMember also
// sends email).
@Global()
@Module({
  providers: [SupabaseService, RedisService, RateLimitService, StorageService, EmailService, NatsService],
  exports: [SupabaseService, RedisService, RateLimitService, StorageService, EmailService, NatsService],
})
export class CommonModule {}
