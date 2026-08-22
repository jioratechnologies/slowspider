import { Global, Module } from "@nestjs/common";
import { SupabaseService } from "./services/supabase.service";
import { RedisService } from "./services/redis.service";
import { RateLimitService } from "./services/rate-limit.service";
import { StorageService } from "./services/storage.service";
import { EmailService } from "./services/email.service";

// Shared providers used by every feature module — Supabase client factory, Redis client,
// rate limiting, email sending, and the storage abstraction. @Global() so feature modules
// don't each need to re-import it (mirrors how apps/web's src/lib/{db,redis,rate-limit,
// email}.ts are just imported wherever needed, no DI wiring required there). EmailService
// lives here rather than in AuthModule specifically to avoid a AuthModule <-> WorkspaceModule
// import cycle (WorkspaceService.inviteMember also sends email).
@Global()
@Module({
  providers: [SupabaseService, RedisService, RateLimitService, StorageService, EmailService],
  exports: [SupabaseService, RedisService, RateLimitService, StorageService, EmailService],
})
export class CommonModule {}
