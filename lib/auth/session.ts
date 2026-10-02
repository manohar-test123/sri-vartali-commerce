import { createClient as createServerClient } from "@/lib/db/server";
import type { AppRole } from "@/lib/auth/roles";

export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
};

export type Session =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: SessionUser };

/**
 * Current caller identity for server code. Distinguishes "Supabase not set
 * up yet" from "no session" so pages can render the right notice instead
 * of crashing during bring-up.
 */
export async function getSession(): Promise<Session> {
  const { isSupabaseConfigured } = await import("@/lib/env");
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "anonymous" };

  // profiles.role is maintained by trigger on signup (schema.sql); the
  // fallback keeps the gate closed if the row is somehow missing.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  return {
    status: "authenticated",
    user: {
      id: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? null,
      role: (profile?.role as AppRole | undefined) ?? "CUSTOMER",
    },
  };
}
