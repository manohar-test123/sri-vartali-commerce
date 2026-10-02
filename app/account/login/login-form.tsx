"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { requestMagicLink, type LoginActionState } from "./actions";

const initial: LoginActionState = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const linkError = params.get("error");
  const [state, formAction, pending] = useActionState(requestMagicLink, initial);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
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
          className="mt-1.5 w-full rounded-md border border-wine-900/20 bg-white px-3 py-2.5 text-base text-wine-950 outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-wine-700">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p role="status" className="rounded-md bg-gold-50 px-3 py-2 text-sm text-wine-900">
          {state.notice}
        </p>
      ) : null}
      {linkError && !state.notice ? (
        <p role="alert" className="text-sm text-wine-700">
          That sign-in link is invalid or expired — request a new one below.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-wine-800 px-5 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-800 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
