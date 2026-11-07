import { Suspense } from "react";

import { ForgotPasswordForm } from "./forgot-form";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-24">
      <h1 className="font-serif text-3xl text-wine-900">Forgot password</h1>
      <p className="mt-2 text-sm leading-6 text-wine-900/70">
        Enter your email and we&apos;ll send a one-time link to set a new
        password. The link signs you in and expires after one hour.
      </p>

      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
