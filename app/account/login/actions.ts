"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient as createServerClient } from "@/lib/db/server";
import { checkRateLimit, formatRetryAfter } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export type LoginActionState = {
  error?: string;
  notice?: string;
};

export type PasswordActionState = {
  error?: string;
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

  // §46 rate limits: one bucket per network (brute force) and one per
  // recipient address (magic-link mail bombing).
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit("login_ip"),
    checkRateLimit("login_email", email),
  ]);
  const limited = !ipLimit.allowed ? ipLimit : !emailLimit.allowed ? emailLimit : null;
  if (limited) {
    return {
      error: `Too many sign-in attempts. Please try again ${formatRetryAfter(
        limited.retryAfterSeconds,
      )}.`,
    };
  }

  const headerList = await headers();
  const origin = headerList.get("origin");
  let baseUrl: string;
  if (origin) {
    baseUrl = origin;
  } else {
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    if (host) {
      const proto = headerList.get("x-forwarded-proto") ?? "https";
      baseUrl = `${proto}://${host}`;
    } else {
      baseUrl = env.siteUrl;
    }
  }
  const next = String(formData.get("next") ?? "/account");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${baseUrl}/account/login/verify?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error) return { error: "Sign-in could not be started. Try again." };

  return {
    notice: `Check ${email} for the sign-in link. New here? The same link creates your account.`,
  };
}

/**
 * Password sign-in for accounts created directly in the Supabase dashboard
 * (staff whose inbox cannot take magic links). Establishes the same session
 * as the magic-link flow.
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
  if (error) return { error: "Email or password is incorrect." };

  redirect(safeNext);
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
