"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient as createServerClient } from "@/lib/db/server";

export type LoginActionState = {
  error?: string;
  notice?: string;
};

/**
 * Magic-link sign-in (spec §7 /account/login). Sends a one-time link to the
 * email; the verify route exchanges it for a session. No passwords to store.
 */
export async function requestMagicLink(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const origin = (await headers()).get("origin");
  const next = String(formData.get("next") ?? "/account");

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/account/login/verify?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: "Sign-in could not be started. Try again." };

  return {
    notice: `Check ${email} for the sign-in link. New here? The same link creates your account.`,
  };
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
