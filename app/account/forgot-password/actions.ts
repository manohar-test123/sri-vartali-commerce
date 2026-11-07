"use server";

import { headers } from "next/headers";

import { otpAuthErrorMessage } from "@/lib/account/auth-errors";
import { createClient as createServerClient } from "@/lib/db/server";
import { checkRateLimit, formatRetryAfter } from "@/lib/rate-limit";

export type ForgotPasswordState = {
  error?: string;
  notice?: string;
};

/**
 * Password-reset request: sends Supabase's recovery email. The link lands
 * on /account/login/verify (type=recovery — already exchanged there for a
 * session) and forwards to /account/reset-password where the new password
 * is set. Rate-limited with the sign-in buckets: reset mails are the same
 * abuse surface as magic links.
 */
export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit("login_ip"),
    checkRateLimit("login_email", email),
  ]);
  const limited = !ipLimit.allowed ? ipLimit : !emailLimit.allowed ? emailLimit : null;
  if (limited) {
    return {
      error: `Too many attempts. Please try again ${formatRetryAfter(
        limited.retryAfterSeconds,
      )}.`,
    };
  }

  const headerList = await headers();
  const origin = headerList.get("origin");
  const baseUrl =
    origin ??
    (headerList.get("x-forwarded-host") ?? headerList.get("host")
      ? `${headerList.get("x-forwarded-proto") ?? "https"}://${
          headerList.get("x-forwarded-host") ?? headerList.get("host")
        }`
      : null);
  const redirectUrl = baseUrl
    ? `${baseUrl}/account/login/verify?next=${encodeURIComponent(
        "/account/reset-password",
      )}`
    : undefined;

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    ...(redirectUrl ? { redirectTo: redirectUrl } : {}),
  });
  if (error) return { error: otpAuthErrorMessage(error) };

  return {
    notice: `If ${email} has an account, a password-reset link is on its way. It is valid for one hour.`,
  };
}
