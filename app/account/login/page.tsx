import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/storefront/brand-mark";
import { getSession } from "@/lib/auth/session";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

/**
 * Phase 27: the header's Account action points here directly, so signed-in
 * visitors bounce straight to their account instead of seeing a login form.
 */
export default async function LoginPage() {
  const session = await getSession();
  if (session.status === "authenticated") redirect("/account");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-24">
      <div className="flex flex-col items-center text-center">
        <BrandMark className="h-14 w-auto rounded-xl" height={56} />
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
