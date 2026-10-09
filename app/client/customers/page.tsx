import type { Metadata } from "next";
import Link from "next/link";

import { formatPaise } from "@/lib/catalog/money";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listCustomers } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Customers · Sri Vartali" };

/**
 * Customer directory (spec §8): phone-keyed customer rows with their order
 * history summary. Read-only by design — customers own their profile and
 * addresses (§7 account pages); the store never edits their PII.
 */
export default async function ClientCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Customers" />;
  }
  const customers = await listCustomers(q);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Orders</p>
      <h1 className="mt-1 font-serif text-3xl text-wine-900">Customers</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-wine-900/70">
        Everyone who has placed an order or created an account, keyed by
        phone. Lifetime value counts non-cancelled orders.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium text-wine-900">
          Search
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, phone or email…"
            className="mt-1 w-72 rounded-lg border border-wine-900/20 bg-white px-3 py-2 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-400 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-full border border-wine-900/25 px-5 py-2 text-sm text-wine-900 transition-colors hover:border-gold-400"
        >
          Apply
        </button>
        {q ? (
          <Link
            href="/client/customers"
            className="pb-2.5 text-sm text-wine-900/60 underline decoration-gold-400 underline-offset-4"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {customers.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-wine-900/25 px-6 py-12 text-center text-sm text-wine-900/50">
          No customers match. Customers appear here automatically after their
          first order or account sign-up.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-wine-900/15 text-left text-[11px] uppercase tracking-[0.1em] text-wine-900/50">
                <th scope="col" className="px-3 py-2">Name</th>
                <th scope="col" className="px-3 py-2">Phone</th>
                <th scope="col" className="px-3 py-2">Email</th>
                <th scope="col" className="px-3 py-2 text-right">Orders</th>
                <th scope="col" className="px-3 py-2 text-right">Lifetime value</th>
                <th scope="col" className="px-3 py-2">Last order</th>
                <th scope="col" className="px-3 py-2">Since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-wine-900/10">
                  <td className="px-3 py-3 font-medium text-wine-900">
                    {c.name}
                    {c.hasAccount ? (
                      <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        account
                      </span>
                    ) : (
                      <span className="ml-2 rounded-full border border-wine-900/15 px-2 py-0.5 text-[11px] font-medium text-wine-900/50">
                        guest
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-wine-900/80">{c.phone}</td>
                  <td className="px-3 py-3 text-wine-900/70">{c.email ?? "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-wine-900/80">
                    {c.orderCount}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-wine-900">
                    {c.orderCount > 0 ? formatPaise(c.lifetimePaise) : "—"}
                  </td>
                  <td className="px-3 py-3 text-wine-900/70">
                    {c.lastOrderAt
                      ? new Date(c.lastOrderAt).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-wine-900/70">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
