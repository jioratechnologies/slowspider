import { SetMetadata } from "@nestjs/common";

// Marks a route (or whole controller) as not requiring a Supabase bearer token — mirrors
// apps/web's withApi() vs withApiAuth() split in src/lib/api/handler.ts. Applied to the auth
// controller's login/signup/reset endpoints and to the cron controller (which uses its own
// CRON_SECRET header check instead of Supabase auth).
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
