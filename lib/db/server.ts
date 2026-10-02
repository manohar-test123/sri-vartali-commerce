import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabaseConfigured, env } from "@/lib/env";

/**
 * Server client for Server Components, Server Actions and Route Handlers.
 * Carries the caller's session cookies, so RLS sees their role.
 */
export async function createClient() {
  assertSupabaseConfigured("createServerClient");
  const cookieStore = await cookies();

  return createServerClient(env.supabase.url!, env.supabase.anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // Session refresh is handled by proxy.ts instead.
        }
      },
    },
  });
}
