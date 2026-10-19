import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
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
        <h1 className="mt-4 font-serif text-3xl text-wine-900">Sign in</h1>
      </div>
      <p className="mt-2 text-sm leading-6 text-wine-900/70">
        Sign in with your email and password. New here?{" "}
        <Link
          href="/account/register"
          className="text-wine-900 underline underline-offset-2"
        >
          Create an account
        </Link>{" "}
        — or request a one-time sign-in link below.
      </p>

      <Suspense>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-xs leading-5 text-wine-900/60">
        Staff accounts (client dashboard, super admin) use the same sign-in —
        access depends on the role granted to your account.
      </p>
    </div>
  );
}
