"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";

import {
  passwordSignIn,
  requestMagicLink,
  type LoginActionState,
  type PasswordActionState,
} from "./actions";

const initialLink: LoginActionState = {};
const initialPassword: PasswordActionState = {};

const inputClass =
  "mt-1.5 w-full rounded-md border border-wine-900/20 bg-white px-3 py-2.5 text-base text-wine-950 outline-none focus-visible:ring-2 focus-visible:ring-gold-400";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const linkError = params.get("error");
  const [mode, setMode] = useState<"link" | "password">("link");
  const [linkState, linkFormAction, linkPending] = useActionState(
    requestMagicLink,
    initialLink,
  );
  const [pwState, pwFormAction, pwPending] = useActionState(
    passwordSignIn,
    initialPassword,
  );

  if (mode === "password") {
    return (
      <>
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

          <button
            type="submit"
            disabled={pwPending}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-wine-800 px-5 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-800 disabled:opacity-60"
          >
            {pwPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode("link")}
          className="mt-4 self-start text-sm text-wine-700 underline underline-offset-4 hover:text-wine-900"
        >
          Email me a one-time link instead
        </button>
      </>
    );
  }

  return (
    <>
      <form action={linkFormAction} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-wine-900"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        {linkState.error ? (
          <p role="alert" className="text-sm text-wine-700">
            {linkState.error}
          </p>
        ) : null}
        {linkState.notice ? (
          <p role="status" className="rounded-md bg-gold-50 px-3 py-2 text-sm text-wine-900">
            {linkState.notice}
          </p>
        ) : null}
        {linkError && !linkState.notice ? (
          <p role="alert" className="text-sm text-wine-700">
            That sign-in link is invalid or expired — request a new one below.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={linkPending}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-wine-800 px-5 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-800 disabled:opacity-60"
        >
          {linkPending ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode("password")}
        className="mt-4 self-start text-sm text-wine-700 underline underline-offset-4 hover:text-wine-900"
      >
        Sign in with a password instead
      </button>
    </>
  );
}
