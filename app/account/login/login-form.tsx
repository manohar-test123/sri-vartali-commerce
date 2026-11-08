"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { passwordSignIn, type PasswordActionState } from "./actions";

const initialPassword: PasswordActionState = {};

const inputClass =
  "mt-1.5 w-full rounded-md border border-wine-900/20 bg-white px-3 py-2.5 text-base text-wine-950 outline-none focus-visible:ring-2 focus-visible:ring-gold-400";

/**
 * Standard email + password sign-in (Phase 19; Phase 28: password-only).
 * Email one-time sign-in links were removed per owner direction — the
 * password form, registration, and the email-based password-reset flow
 * (which is account recovery, not sign-in) cover every account path.
 * The ?error= banner still surfaces invalid/expired links from the verify
 * route (signup confirmation / password recovery land there).
 */
export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const linkError = params.get("error");
  const [pwState, pwFormAction, pwPending] = useActionState(
    passwordSignIn,
    initialPassword,
  );

  return (
    <form action={pwFormAction} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label
          htmlFor="pw-email"
          className="block text-sm font-medium text-wine-900"
        >
          Email
        </label>
        <input
          id="pw-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="pw-password"
          className="block text-sm font-medium text-wine-900"
        >
          Password
        </label>
        <input
          id="pw-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      {pwState.error ? (
        <p role="alert" className="text-sm text-wine-700">
          {pwState.error}
        </p>
      ) : null}
      {linkError ? (
        <p role="alert" className="text-sm text-wine-700">
          That link is invalid or expired — request a new one via Forgot
          password, or sign in with your password.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pwPending}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-wine-800 px-5 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-800 disabled:opacity-60"
      >
        {pwPending ? "Signing in…" : "Sign in"}
      </button>
      {/* Directly below the password field's submit row (Phase 27). */}
      <Link
        href="/account/forgot-password"
        className="mt-1 self-start text-sm text-wine-700 underline underline-offset-4 hover:text-wine-900"
      >
        Forgot password?
      </Link>
    </form>
  );
}
