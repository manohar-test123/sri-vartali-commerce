"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient as createServerClient } from "@/lib/db/server";
import { checkRateLimit, formatRetryAfter } from "@/lib/rate-limit";
import {
  mapSignUpError,
  validateRegistration,
} from "@/lib/account/register";

export type RegisterActionState = {
  fieldErrors?: Record<string, string>;
  error?: string;
  notice?: string;
};

/**
 * Phase 20 account creation: name, email, password + confirmation. The
 * profile row (with the name) is created by the database's
 * handle_new_user trigger from the sign-up metadata — no extra write.
 */
export async function createAccount(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  // §46-style guards: per network (account-farming bursts) and per address
  // (repeat sign-up mail). Registration gets its own buckets so a burst
  // never locks out sign-in.
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit("register_ip"),
    checkRateLimit("register_email", input.email),
  ]);
  const limited = !ipLimit.allowed ? ipLimit : !emailLimit.allowed ? emailLimit : null;
  if (limited) {
    return {
      error: `Too many attempts. Please try again ${formatRetryAfter(
        limited.retryAfterSeconds,
      )}.`,
    };
  }

  const fieldErrors = validateRegistration(input);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const headerList = await headers();
  const origin = headerList.get("origin");
  const baseUrl =
    origin ??
    (headerList.get("x-forwarded-host") ?? headerList.get("host")
      ? `${headerList.get("x-forwarded-proto") ?? "https"}://${
          headerList.get("x-forwarded-host") ?? headerList.get("host")
        }`
      : null);

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      // handle_new_user reads full_name/name from the metadata.
      data: { full_name: input.name.trim(), name: input.name.trim() },
      ...(baseUrl
        ? {
            emailRedirectTo: `${baseUrl}/account/login/verify?next=${encodeURIComponent(
              "/account",
            )}`,
          }
        : {}),
    },
  });

  if (error) return { error: mapSignUpError(error.message) };

  // Projects with email confirmation on return no session here — the
  // welcome/confirmation mail carries the link that establishes it.
  if (data.session) redirect("/account");

  return {
    notice: `Account created. Check ${input.email} for the confirmation link to sign in for the first time.`,
  };
}
