"use client";

/** /account/profile form — name + phone, linking the phone-keyed order history. */

import { useActionState } from "react";

import { saveProfileAction, type AccountActionResult } from "@/lib/account/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-wine-900/20 bg-white px-3 py-2.5 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-500 focus:outline-none";

const initial: AccountActionResult | null = null;

export function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const [state, action, pending] = useActionState(saveProfileAction, initial);

  return (
    <form action={action} className="grid gap-4 sm:max-w-md">
      <div>
        <label htmlFor="profile-name" className="block text-xs text-wine-900/60">
          Your name
        </label>
        <input
          id="profile-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          defaultValue={initialName}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="profile-phone" className="block text-xs text-wine-900/60">
          Phone number you order with
        </label>
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          required
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit WhatsApp number"
          defaultValue={initialPhone}
          className={inputClass}
        />
        <p className="mt-1.5 text-xs leading-5 text-wine-900/50">
          Orders are placed with this number. Saving it links your order
          history and address book to this account.
        </p>
      </div>

      {state?.status === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.status === "ok" && state.message ? (
        <p role="status" className="text-sm text-emerald-800">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded-full bg-wine-900 px-6 py-2.5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
