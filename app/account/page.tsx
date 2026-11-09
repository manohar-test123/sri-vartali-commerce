import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { canAccessAdminArea, canAccessClientArea } from "@/lib/auth/roles";
import { getAccountCustomer } from "@/lib/account/queries";

import { signOut } from "./login/actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your account · Sri Vartali" };

/**
 * Account page (spec §7 /account). Phase 32: simplified per owner
 * direction — the normal user's account is a single Profile card (name,
 * email, phone) with sign-out. Orders, addresses and their notification
 * are removed; staff dashboard links remain for client/super-admin roles.
 */
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
          </Link>
          .
        </p>
      </div>
    );
  }

  const { user } = session;
  const customer = await getAccountCustomer(user.id);
  const greeting = customer?.name ?? user.fullName ?? user.email ?? "there";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-gold-600">
        Sri Vartali Sarees
      </p>
      <h1 className="mt-2 text-center font-serif text-3xl text-wine-900">
        Hello, {greeting}
      </h1>

      {/* Profile card — the single section on the normal user's account */}
      <div className="mt-8 rounded-2xl border border-wine-900/15 bg-white/80 p-6 sm:p-8">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              Name
            </p>
            <p className="mt-1 font-serif text-lg text-wine-900">
              {customer?.name ?? user.fullName ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              Email
            </p>
            <p className="mt-1 text-sm text-wine-900">{user.email}</p>
          </div>
          {customer?.phone ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
                Phone
              </p>
              <p className="mt-1 text-sm text-wine-900">{customer.phone}</p>
            </div>
          ) : null}
        </div>

        <Link
          href="/account/profile"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full border border-wine-900/20 px-5 text-sm font-medium text-wine-900 transition-colors hover:border-wine-900/40"
        >
          Edit profile
        </Link>
      </div>

      {/* Staff shortcuts (visible only to client/super-admin roles) */}
      {canAccessClientArea(user.role) || canAccessAdminArea(user.role) ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
        </div>
      ) : null}

      <div className="mt-8 text-center">
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full bg-wine-800 px-8 text-sm font-medium text-ivory-50 hover:bg-wine-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
