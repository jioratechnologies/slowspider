import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Server-only: uses the service_role key, which bypasses RLS entirely. Every caller MUST
// scope its own queries to the signed-in user (there is no RLS backstop anymore — NextAuth
// sessions aren't Supabase JWTs, so Postgres has no idea who "the current user" is on its
// own). This is used purely as a Postgres client now, not Supabase Auth.
export function db(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return cached;
}
