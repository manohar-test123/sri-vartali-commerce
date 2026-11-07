"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initial: ForgotPasswordState = {};
const inputClass =
  "mt-1.5 w-full rounded-md border border-wine-900/20 bg-white px-3 py-2.5 text-base text-wine-950 outline-none focus-visible:ring-2 focus-visible:ring-gold-400";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initial,
  );

  return (
    <>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-sm font-medium text-wine-900"
          >
            Email
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-wine-700">
            {state.error}
          </p>
        ) : null}
        {state.notice ? (
          <p
            role="status"
            className="rounded-md bg-gold-50 px-3 py-2 text-sm text-wine-900"
          >
            {state.notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-wine-800 px-5 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-800 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <Link
        href="/account/login"
        className="mt-4 self-start text-sm text-wine-700 underline underline-offset-4 hover:text-wine-900"
      >
        Back to sign in
      </Link>
    </>
  );
}
