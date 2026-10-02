import Link from "next/link";

import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Client dashboard" };

/**
 * Client dashboard home (spec §8/§38). Phase 2 landed the product CMS at
 * /client/products; orders/payments/shipping arrive with Phase 3/6.
 */
export default async function ClientDashboardPage() {
  const session = await getSession();

  if (session.status === "unconfigured") {
    return (
      <DashboardShell>
        <SetupNotice />
      </DashboardShell>
    );
  }

  const who =
    session.status === "authenticated"
      ? `${session.user.email ?? session.user.id} · ${session.user.role}`
      : "not signed in (gate inactive)";

  return (
    <DashboardShell>
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Client area</p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Client dashboard</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/client/products"
          className="group rounded-lg border border-wine-900/20 bg-white p-6 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Products</p>
          <h2 className="mt-1 font-serif text-xl text-wine-900">Product catalogue &amp; CMS</h2>
          <p className="mt-2 text-sm leading-6 text-wine-900/70">
            Create and manage Sarees, Dresses, Kurtis and more — categories,
            variants, pricing and inventory.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-wine-800 underline decoration-gold-400 underline-offset-4 group-hover:text-wine-700">
            Open products →
          </span>
        </Link>

        <div className="rounded-lg border border-dashed border-wine-900/25 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Phase 3 / 6</p>
          <h2 className="mt-1 font-serif text-xl text-wine-900/70">Orders, payments &amp; shipping</h2>
          <p className="mt-2 text-sm leading-6 text-wine-900/50">
            Order management, WhatsApp payment verification and shipping tools
            arrive with Phase 3 and Phase 6.
          </p>
        </div>
      </div>

      <p className="mt-8 text-xs text-wine-900/50">Signed in: {who}</p>
    </DashboardShell>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-ivory-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">{children}</div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl text-wine-900">Client dashboard</h1>
      <p className="mt-3 text-sm leading-6 text-wine-900/70">
        Supabase is not configured. Fill <code className="rounded bg-gold-50 px-1">.env.local</code>{" "}
        from <code className="rounded bg-gold-50 px-1">.env.example</code> and apply{" "}
        <code className="rounded bg-gold-50 px-1">supabase/migrations/20261002150000_init_schema.sql</code> first — the auth gate
        activates automatically once configured.
      </p>
    </div>
  );
}
