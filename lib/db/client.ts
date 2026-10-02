import { createBrowserClient } from "@supabase/ssr";

import { assertSupabaseConfigured, env } from "@/lib/env";

/** Browser client — anon key only, bound to RLS. */
export function createClient() {
  assertSupabaseConfigured("createBrowserClient");
  return createBrowserClient(env.supabase.url!, env.supabase.anonKey!);
}
