import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// RLS-respecting client for the currently signed-in user — this is what makes workspace
// access control real (Postgres checks it), not just an app-code convention. Used by the
// service layer for all board reads/writes. Admin operations (creating auth.users,
// resetting a password before a session exists) still go through the service_role client
// in db.ts, which deliberately bypasses RLS.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies can't be mutated —
          // middleware.ts refreshes the session on every request instead.
        }
      },
    },
  });
}
