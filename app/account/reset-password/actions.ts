"use server";

import { redirect } from "next/navigation";

import { validatePasswordStrength } from "@/lib/account/register";
import { createClient as createServerClient } from "@/lib/db/server";
import { getSession } from "@/lib/auth/session";

export type ResetPasswordState = {
  fieldErrors?: { password?: string; confirmPassword?: string };
  error?: string;
};

/**
 * Set a new password. Only reachable with a live session — the recovery
 * email lands on /account/login/verify (type=recovery), which exchanges
 * the token for exactly that session before forwarding here. The same
 * password policy as registration applies; on success the account page
 * takes over (already signed in with the new password).
 */
export async function setNewPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: ResetPasswordState["fieldErrors"] = {};
  const policy = validatePasswordStrength(password);
  if (policy) fieldErrors.password = policy;
  if (confirmPassword !== password) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const session = await getSession();
  if (session.status !== "authenticated") {
    redirect("/account/login?error=expired-link");
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "The password could not be updated. The reset link may have expired — request a new one." };
  }

  redirect("/account?reset=1");
}
