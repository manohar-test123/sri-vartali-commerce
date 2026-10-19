"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createAccount, type RegisterActionState } from "./actions";

const initial: RegisterActionState = {};

const inputClass =
  "mt-1.5 w-full rounded-md border border-wine-900/20 bg-white px-3 py-2.5 text-base text-wine-950 outline-none focus-visible:ring-2 focus-visible:ring-gold-400";

function Field({
  id,
  label,
  type,
  autoComplete,
  error,
  hint,
}: {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-wine-900">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={inputClass}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-wine-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-wine-900/50">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Phase 20 sign-up: name, email, password + confirmation with per-field
 *  validation errors straight from the shared pure rules. */
export function RegisterForm() {
  const [state, formAction, pending] = useActionState(createAccount, initial);

  if (state.notice) {
    return (
      <div className="mt-8">
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
        >
          {state.notice}
        </p>
        <p className="mt-4 text-sm text-wine-900/70">
          Already confirmed?{" "}
          <Link href="/account/login" className="text-wine-900 underline underline-offset-2">
            Sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <Field
        id="name"
        label="Full name"
        type="text"
        autoComplete="name"
        error={state.fieldErrors?.name}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={state.fieldErrors?.email}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        hint="At least 8 characters, with a letter and a number."
      />
      <Field
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword}
      />

      {state.error ? (
        <p role="alert" className="text-sm text-wine-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-wine-900 px-6 py-2.5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm text-wine-900/70">
        Already have an account?{" "}
        <Link href="/account/login" className="text-wine-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
