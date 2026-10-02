import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { canAccessAdminArea, canAccessClientArea } from "@/lib/auth/roles";

import { signOut } from "./login/actions";

export const dynamic = "force-dynamic";

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
        </p>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-24">
      <h1 className="font-serif text-3xl text-wine-900">Account</h1>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-wine-900/60">Email</dt>
          <dd className="text-wine-950">{user.email ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-wine-900/60">Role</dt>
          <dd>
            <code className="rounded bg-gold-50 px-1.5 py-0.5 text-xs text-wine-900">{user.role}</code>
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-3">
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
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-wine-800 px-5 text-sm font-medium text-ivory-50 hover:bg-wine-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
