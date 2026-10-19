import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

/** Phase 20 registration: explicit sign-up with name, email, password +
 *  confirmation. The brand mark anchors the page like the other auth
 *  surfaces. */
export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-24">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.svg"
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 rounded-xl"
        />
        <h1 className="mt-4 font-serif text-3xl text-wine-900">
          Create an account
        </h1>
        <p className="mt-2 text-sm leading-6 text-wine-900/70">
          Track your orders, keep your addresses and wishlist in one place.
        </p>
      </div>

      <RegisterForm />

      <p className="mt-6 text-xs leading-5 text-wine-900/60">
        By creating an account you agree to be contacted about your orders on
        the email and phone you provide.
      </p>
    </div>
  );
}
