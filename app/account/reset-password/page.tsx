import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { ResetPasswordForm } from "./reset-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Set a new password" };

/**
 * Reached only through the recovery email (verify → next=/account/reset-password).
 * Anonymous visitors are pushed back to sign in — there is nothing to reset.
 */
export default async function ResetPasswordPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24">
        <h1 className="font-serif text-3xl text-wine-900">Set a new password</h1>
        <p className="mt-4 text-sm leading-6 text-wine-900/70">
          Supabase is not configured yet — see the setup instructions.
        </p>
      </div>
    );
  }
  if (session.status === "anonymous") {
    redirect("/account/login?error=expired-link");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-24">
      <h1 className="font-serif text-3xl text-wine-900">Set a new password</h1>
      <p className="mt-2 text-sm leading-6 text-wine-900/70">
        Choose a new password for your account. You are signed in via the
        reset link — once saved, it stays your sign-in password.
      </p>

      <ResetPasswordForm />

      <p className="mt-6 text-xs text-wine-900/60">
        Wrong window?{" "}
        <Link
          href="/account"
          className="underline underline-offset-2 hover:text-wine-900"
        >
          Back to your account
        </Link>
      </p>
    </div>
  );
}
