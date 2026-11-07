"use server";

import { redirect } from "next/navigation";

import { passwordAuthErrorMessage } from "@/lib/account/auth-errors";
import { createClient as createServerClient } from "@/lib/db/server";
import { checkRateLimit, formatRetryAfter } from "@/lib/rate-limit";

export type PasswordActionState = {
  error?: string;
};

/**
 * Password sign-in (§7 /account/login). Phase 28: the magic-link
 * (email one-time sign-in) flow was removed per owner direction — this
 * action is the single sign-in path. Password recovery keeps its own
 * email flow under /account/forgot-password; the verify route remains
 * for signup-confirmation and recovery links.
 */
export async function passwordSignIn(
  _prev: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password) {
    return { error: "Enter your email and password." };
  }

  // §46 rate limit: per network — password guessing gets slow fast.
  const ipLimit = await checkRateLimit("login_ip");
  if (!ipLimit.allowed) {
    return {
      error: `Too many sign-in attempts. Please try again ${formatRetryAfter(
        ipLimit.retryAfterSeconds,
      )}.`,
    };
  }

  const next = String(formData.get("next") ?? "/account");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: passwordAuthErrorMessage(error) };

  redirect(safeNext);
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
