import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { assertServiceRoleConfigured, env } from "@/lib/env";

/**
 * Admin client using the service-role key — bypasses RLS.
 *
 * NEVER import this from a Client Component or ship it toward the browser:
 * the service-role key must never appear in client code (spec §46, rule 13).
 * The window guard below turns an accidental import into a loud failure.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient must never run in the browser — the service-role key is server-only (spec §46).",
    );
  }
  assertServiceRoleConfigured("createAdminClient");

  return createSupabaseClient(
    env.supabase.url!,
    env.supabase.serviceRoleKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
