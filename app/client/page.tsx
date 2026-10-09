import Link from "next/link";

import { OrdersLive } from "@/components/client/orders-live";
import { getSession } from "@/lib/auth/session";
import { dashboardStats } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Client dashboard" };

/**
 * Client dashboard home (spec §8/§38): today's counters, action-required
 * orders, and links into the CMS and order list.
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

  const stats = await dashboardStats();
  const who =
    session.status === "authenticated"
      ? `${session.user.email ?? session.user.id} · ${session.user.role}`
      : "not signed in (gate inactive)";

  return (
    <DashboardShell>
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Client area</p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Client dashboard</h1>

      <section aria-labelledby="today-heading" className="mt-8">
        <h2 id="today-heading" className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Today
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Orders" value={stats.todayOrders} />
          <Stat label="Pending payment" value={stats.pendingPayment} />
          <Stat label="Paid / ready to pack" value={stats.paidReadyToPack} />
          <Stat label="Shipped" value={stats.shipped} />
          <Stat label="Low stock" value={stats.lowStock} />
        </dl>
      </section>

      <section aria-labelledby="action-heading" className="mt-8">
        <h2 id="action-heading" className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Action required
        </h2>
        {stats.actionRequired.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-wine-900/25 px-4 py-6 text-center text-sm text-wine-900/50">
            Nothing needs you right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stats.actionRequired.map((row) => (
              <li key={`${row.id}-${row.reason}`}>
                <Link
                  href={`/client/orders/${row.id}`}
                  className="flex items-center justify-between rounded-xl border border-wine-900/15 bg-white px-4 py-3 text-sm transition-colors hover:border-gold-400"
                >
                  <span className="font-medium text-wine-900">{row.order_number}</span>
                  <span className="text-wine-900/60">{row.reason}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/client/orders"
          className="group rounded-lg border border-wine-900/20 bg-white p-6 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Orders</p>
          <h2 className="mt-1 font-serif text-xl text-wine-900">Order dashboard</h2>
          <p className="mt-2 text-sm leading-6 text-wine-900/70">
            Every placed order with payment and fulfilment status, stock
            reservations, cancel / packing actions and status history.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-wine-800 underline decoration-gold-400 underline-offset-4 group-hover:text-wine-700">
            Open orders →
          </span>
        </Link>

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

        <Link
          href="/client/reviews"
          className="group rounded-lg border border-wine-900/20 bg-white p-6 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Reviews</p>
          <h2 className="mt-1 font-serif text-xl text-wine-900">Review moderation</h2>
          <p className="mt-2 text-sm leading-6 text-wine-900/70">
            Verified-buyer reviews arrive here for approval — nothing is
            public on the storefront until you publish it.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-wine-800 underline decoration-gold-400 underline-offset-4 group-hover:text-wine-700">
            Open reviews →
          </span>
        </Link>

        <Link
          href="/client/settings"
          className="group rounded-lg border border-wine-900/20 bg-white p-6 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Settings</p>
          <h2 className="mt-1 font-serif text-xl text-wine-900">Payment &amp; WhatsApp</h2>
          <p className="mt-2 text-sm leading-6 text-wine-900/70">
            UPI ID, QR image and payment instructions for the automatic
            WhatsApp reply, the store WhatsApp number, and integration status.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-wine-800 underline decoration-gold-400 underline-offset-4 group-hover:text-wine-700">
            Open settings →
          </span>
        </Link>
      </div>

      <nav aria-label="Catalog and order management" className="mt-6 flex flex-wrap gap-2 text-sm">
        {(
          [
            ["/client/categories", "Categories"],
            ["/client/collections", "Collections"],
            ["/client/inventory", "Inventory"],
            ["/client/customers", "Customers"],
            ["/client/shipping", "Shipping"],
          ] as const
        ).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full border border-wine-900/20 bg-white px-4 py-1.5 text-wine-900/70 transition-colors hover:border-gold-400 hover:text-wine-900"
          >
            {label}
          </Link>
        ))}
      </nav>

      <p className="mt-8 text-xs text-wine-900/50">Signed in: {who}</p>

      {/* §39: live order/status updates while this page is open. */}
      <OrdersLive />
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-wine-900/15 bg-white px-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.1em] text-wine-900/50">{label}</dt>
      <dd className="mt-1 font-serif text-2xl text-wine-900">{value}</dd>
    </div>
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
