import type { Metadata } from "next";
import Link from "next/link";

import { ProfileForm } from "@/components/account/profile-form";
import { getSession } from "@/lib/auth/session";
import { getAccountCustomer } from "@/lib/account/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your profile · Sri Vartali" };

/** Customer profile (spec §7 /account/profile): name + order phone. */
export default async function AccountProfilePage() {
  const session = await getSession();

  if (session.status !== "authenticated") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24">
        <h1 className="font-serif text-3xl text-wine-900">Your profile</h1>
        <p className="mt-4 text-sm leading-6 text-wine-900/70">
          Please{" "}
          <Link href="/account/login?next=/account/profile" className="underline decoration-gold-400 underline-offset-2">
            sign in
          </Link>{" "}
          to manage your profile.
        </p>
      </div>
    );
  }

  const customer = await getAccountCustomer(session.user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Account</p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Your profile</h1>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-wine-900/60">Email</dt>
          <dd className="text-wine-950">{session.user.email ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-wine-900/60">Account type</dt>
          <dd>
            <code className="rounded bg-gold-50 px-1.5 py-0.5 text-xs text-wine-900">
              {session.user.role}
            </code>
          </dd>
        </div>
      </dl>

      <h2 className="mt-10 font-serif text-xl text-wine-900">Order details</h2>
      <p className="mt-1.5 text-sm leading-6 text-wine-900/60">
        Checkout runs on your name and WhatsApp number. Saving the number you
        order with links this account to that order history and address book.
      </p>
      <div className="mt-5">
        <ProfileForm
          initialName={customer?.name ?? session.user.fullName ?? ""}
          initialPhone={customer?.phone ?? ""}
        />
      </div>
    </div>
  );
}
