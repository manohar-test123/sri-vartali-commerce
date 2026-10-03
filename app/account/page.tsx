import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { canAccessAdminArea, canAccessClientArea } from "@/lib/auth/roles";
import { getAccountCustomer } from "@/lib/account/queries";

import { signOut } from "./login/actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your account · Sri Vartali" };

/** Account hub (spec §7 /account): identity + the self-service routes. */
export default async function AccountPage() {
  const session = await getSession();

  if (session.status === "unconfigured") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24">
        <h1 className="font-serif text-3xl text-wine-900">Account</h1>
        <p className="mt-4 text-sm leading-6 text-wine-900/70">
          Supabase is not configured yet. Set <code className="rounded bg-gold-50 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and <code className="rounded bg-gold-50 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
          <code className="rounded bg-gold-50 px-1">.env.local</code>, then apply{" "}
          <code className="rounded bg-gold-50 px-1">supabase/migrations/20261002150000_init_schema.sql</code>.
        </p>
      </div>
    );
  }

  if (session.status === "anonymous") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24">
        <h1 className="font-serif text-3xl text-wine-900">Account</h1>
        <p className="mt-4 text-sm leading-6 text-wine-900/70">
          You are signed out.{" "}
          <Link href="/account/login" className="underline decoration-gold-400 underline-offset-2">
            Sign in
          </Link>{" "}
          to see your orders, saved addresses and profile.
        </p>
      </div>
    );
  }

  const { user } = session;
  const customer = await getAccountCustomer(user.id);
  const greeting = customer?.name ?? user.fullName ?? user.email ?? "there";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
        Sri Vartali Sarees
      </p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">
        Hello, {greeting}
      </h1>
      <p className="mt-2 text-sm text-wine-900/60">
        {user.email}
        {customer ? ` · ${customer.phone}` : ""}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/account/orders"
          className="group rounded-lg border border-wine-900/20 bg-white p-5 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Orders</p>
          <h2 className="mt-1 font-serif text-lg text-wine-900">Your orders</h2>
          <p className="mt-1.5 text-sm text-wine-900/60">
            Every order linked to this account, with live status and tracking.
          </p>
        </Link>
        <Link
          href="/account/addresses"
          className="group rounded-lg border border-wine-900/20 bg-white p-5 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Addresses</p>
          <h2 className="mt-1 font-serif text-lg text-wine-900">Address book</h2>
          <p className="mt-1.5 text-sm text-wine-900/60">
            Save delivery addresses once, reuse them at checkout.
          </p>
        </Link>
        <Link
          href="/account/profile"
          className="group rounded-lg border border-wine-900/20 bg-white p-5 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Profile</p>
          <h2 className="mt-1 font-serif text-lg text-wine-900">Profile</h2>
          <p className="mt-1.5 text-sm text-wine-900/60">
            Your name and the phone number you order with.
          </p>
        </Link>
      </div>

      {!customer ? (
        <p className="mt-6 rounded-xl border border-dashed border-wine-900/25 px-4 py-4 text-sm leading-6 text-wine-900/60">
          Orders placed by phone aren&apos;t linked yet — add your phone number
          in{" "}
          <Link href="/account/profile" className="underline decoration-gold-400 underline-offset-2">
            Profile
          </Link>{" "}
          and they&apos;ll appear under{" "}
          <Link href="/account/orders" className="underline decoration-gold-400 underline-offset-2">
            Your orders
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        {canAccessClientArea(user.role) ? (
          <Link
            href="/client"
            className="inline-flex h-11 items-center justify-center rounded-md border border-wine-900/20 px-5 text-sm font-medium text-wine-900 hover:bg-ivory-200"
          >
            Client dashboard
          </Link>
        ) : null}
        {canAccessAdminArea(user.role) ? (
          <Link
            href="/admin"
            className="inline-flex h-11 items-center justify-center rounded-md border border-wine-900/20 px-5 text-sm font-medium text-wine-900 hover:bg-ivory-200"
          >
            Super admin
          </Link>
        ) : null}
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-wine-800 px-5 text-sm font-medium text-ivory-50 hover:bg-wine-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
