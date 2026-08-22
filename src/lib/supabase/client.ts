"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client — publishable key, safe to expose (RLS is the real boundary now). Used for the
// Realtime subscription, which is inherently a direct browser-to-Supabase connection and
// can't be proxied through our own Route Handlers.
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
