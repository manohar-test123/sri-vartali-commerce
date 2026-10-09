"use client";

/**
 * §15D cross-product inventory: on-hand, reserved and available per variant,
 * with inline quantity/threshold adjustments. Every quantity change writes
 * an inventory_movements MANUAL_ADJUST ledger row (see the action).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { adjustInventory } from "@/lib/dashboard/actions";
import type { InventoryRow } from "@/lib/dashboard/queries";
import { stockHealth, type StockHealth } from "@/lib/dashboard/validation";

const HEALTH_STYLES: Record<StockHealth, string> = {
  OUT: "border-red-200 bg-red-50 text-red-800",
  LOW: "border-amber-200 bg-amber-50 text-amber-800",
  OK: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const HEALTH_LABELS: Record<StockHealth, string> = {
  OUT: "None available",
  LOW: "Low stock",
  OK: "In stock",
};

export function InventoryTable({
  rows,
  canEdit,
}: {
  rows: InventoryRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function submit(inventoryId: string, form: FormData) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await adjustInventory(inventoryId, form);
      if (result.ok) {
        setNotice("Stock saved.");
        setEditingId(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      {notice ? (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-wine-900/15 text-left text-[11px] uppercase tracking-[0.1em] text-wine-900/50">
              <th scope="col" className="px-3 py-2">Product</th>
              <th scope="col" className="px-3 py-2">Variant</th>
              <th scope="col" className="px-3 py-2 text-right">On hand</th>
              <th scope="col" className="px-3 py-2 text-right">Reserved</th>
              <th scope="col" className="px-3 py-2 text-right">Available</th>
              <th scope="col" className="px-3 py-2">Status</th>
              {canEdit ? <th scope="col" className="px-3 py-2 text-right">Adjust</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const available = row.quantity - row.reservedQuantity;
              const health = stockHealth(
                row.quantity,
                row.reservedQuantity,
                row.lowStockThreshold,
              );
              return (
                <tr key={row.inventoryId} className="border-b border-wine-900/10 align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-wine-900">{row.productName}</p>
                    <p className="text-xs text-wine-900/50">
                      {row.productCode}
                      {row.productStatus !== "PUBLISHED" ? ` · ${row.productStatus.toLowerCase()}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-wine-900/80">{row.variantName ?? "Default"}</p>
                    <p className="text-xs text-wine-900/50">{row.sku}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-wine-900">
                    {row.quantity}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-wine-900/70">
                    {row.reservedQuantity}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-wine-900">
                    {available}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${HEALTH_STYLES[health]}`}
                    >
                      {HEALTH_LABELS[health]}
                    </span>
                    <span className="mt-1 block text-[11px] text-wine-900/40">
                      low at ≤ {row.lowStockThreshold}
                    </span>
                  </td>
                  {canEdit ? (
                    <td className="px-3 py-3 text-right">
                      {editingId === row.inventoryId ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            submit(row.inventoryId, new FormData(event.currentTarget));
                          }}
                          className="inline-flex flex-col items-end gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-wine-900/60">
                              Stock
                              <input
                                type="number"
                                name="quantity"
                                min={0}
                                step={1}
                                required
                                defaultValue={row.quantity}
                                disabled={pending}
                                className="ml-1 w-20 rounded-lg border border-wine-900/20 px-2 py-1 text-right text-sm focus:border-gold-400 focus:outline-none"
                              />
                            </label>
                            <label className="text-xs text-wine-900/60">
                              Low at
                              <input
                                type="number"
                                name="lowStockThreshold"
                                min={0}
                                step={1}
                                defaultValue={row.lowStockThreshold}
                                disabled={pending}
                                className="ml-1 w-16 rounded-lg border border-wine-900/20 px-2 py-1 text-right text-sm focus:border-gold-400 focus:outline-none"
                              />
                            </label>
                          </div>
                          <input
                            type="text"
                            name="note"
                            placeholder="Note for the ledger (optional)"
                            maxLength={200}
                            disabled={pending}
                            className="w-56 rounded-lg border border-wine-900/20 px-2 py-1 text-sm focus:border-gold-400 focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={pending}
                              className="rounded-full border border-wine-900/25 px-3 py-1 text-xs text-wine-900"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={pending}
                              className="rounded-full bg-wine-900 px-4 py-1 text-xs text-ivory-50"
                            >
                              {pending ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingId(row.inventoryId)}
                          className="rounded-full border border-wine-900/25 px-4 py-1.5 text-sm text-wine-900 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center text-sm text-wine-900/50">
          Nothing matches — clear the search or the low-stock filter.
        </p>
      ) : null}
    </div>
  );
}
