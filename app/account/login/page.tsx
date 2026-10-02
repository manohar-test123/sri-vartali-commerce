import { Suspense } from "react";

import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-24">
      <h1 className="font-serif text-3xl text-wine-900">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-wine-900/70">
        We&apos;ll email you a one-time sign-in link. No password needed.
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
