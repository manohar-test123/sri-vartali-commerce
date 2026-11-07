"use client";

import { useActionState } from "react";

import { setNewPassword, type ResetPasswordState } from "./actions";

const initial: ResetPasswordState = {};
const inputClass =
  "mt-1.5 w-full rounded-md border border-wine-900/20 bg-white px-3 py-2.5 text-base text-wine-950 outline-none focus-visible:ring-2 focus-visible:ring-gold-400";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(setNewPassword, initial);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <div>
        <label
          htmlFor="new-password"
          className="block text-sm font-medium text-wine-900"
        >
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        {state.fieldErrors?.password ? (
          <p className="mt-1 text-xs text-wine-700">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="confirm-new-password"
          className="block text-sm font-medium text-wine-900"
        >
          Confirm password
        </label>
        <input
          id="confirm-new-password"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="mt-1 text-xs text-wine-700">
            {state.fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-wine-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-wine-800 px-5 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
