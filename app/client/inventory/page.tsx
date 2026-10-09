import type { Metadata } from "next";
import Link from "next/link";

import { InventoryTable } from "@/components/client/inventory-table";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listInventory } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Inventory · Sri Vartali" };

/**
 * Cross-product inventory view (spec §8, §15D, §26): every variant's
 * on-hand / reserved / available position in one table, with inline
 * adjustments that write the movements ledger.
 */
export default async function ClientInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string }>;
}) {
  const { q, low } = await searchParams;
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Inventory" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  const canEdit =
    role === "CLIENT_OWNER" || role === "CLIENT_STAFF" || role === "SUPER_ADMIN";

  const rows = await listInventory(q, low === "1");
  const outCount = rows.filter((r) => r.quantity - r.reservedQuantity <= 0).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Catalog</p>
      <h1 className="mt-1 font-serif text-3xl text-wine-900">Inventory</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-wine-900/70">
        Stock across every product and variant. Reserved units belong to
        placed, unshipped orders (§26) — available is what new customers can
        still buy. Every manual change is recorded in the stock ledger.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium text-wine-900">
          Search
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Product, code, SKU…"
            className="mt-1 w-64 rounded-lg border border-wine-900/20 bg-white px-3 py-2 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-400 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-wine-900">
          <input
            type="checkbox"
            name="low"
            value="1"
            defaultChecked={low === "1"}
            className="h-4 w-4 rounded border-wine-900/30 accent-wine-900"
          />
          Low stock only
        </label>
        <button
          type="submit"
          className="rounded-full border border-wine-900/25 px-5 py-2 text-sm text-wine-900 transition-colors hover:border-gold-400"
        >
          Apply
        </button>
        {q || low === "1" ? (
          <Link
            href="/client/inventory"
            className="pb-2.5 text-sm text-wine-900/60 underline decoration-gold-400 underline-offset-4"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mt-4 text-xs text-wine-900/50" role="status">
        {rows.length} variant row{rows.length === 1 ? "" : "s"}
        {outCount > 0 ? ` · ${outCount} with nothing available` : ""}
      </p>

      <div className="mt-4">
        <InventoryTable rows={rows} canEdit={canEdit} />
      </div>
    </div>
  );
}
