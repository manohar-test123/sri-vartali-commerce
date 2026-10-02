"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { addVariant, setStock, updateVariant } from "@/lib/catalog/actions";
import { parseRupeesToPaise } from "@/lib/catalog/money";
import type { VariantWithStock } from "@/lib/catalog/queries";

/** Inventory & variants (§3, §15D): per-variant stock, price overrides. */
export function VariantsSection({
  productId,
  variants,
}: {
  productId: string;
  variants: VariantWithStock[];
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  const [thresholdEdits, setThresholdEdits] = useState<Record<string, string>>({});

  async function guard(action: () => Promise<{ ok: boolean; error?: string }>) {
    const result = await action();
    if (result.ok) router.refresh();
    else setNotice(result.error ?? "Something went wrong.");
  }

  async function add() {
    if (newName.trim() === "") return;
    const price = newPrice.trim() === "" ? null : parseRupeesToPaise(newPrice);
    if (newPrice.trim() !== "" && price === null) {
      setNotice("Variant price must look like 5999 or 5999.50.");
      return;
    }
    await guard(() => addVariant(productId, { name: newName, sellingPricePaise: price }));
    setNewName("");
    setNewPrice("");
  }

  async function saveStock(variant: VariantWithStock) {
    const quantity = stockEdits[variant.id];
    const threshold = thresholdEdits[variant.id];
    const parsedQ = quantity !== undefined ? Number(quantity) : variant.quantity;
    const parsedT =
      threshold !== undefined ? Number(threshold) : variant.lowStockThreshold;
    if (!Number.isSafeInteger(parsedQ) || parsedQ < 0) {
      setNotice("Stock must be a whole number ≥ 0.");
      return;
    }
    if (!Number.isSafeInteger(parsedT) || parsedT < 0) {
      setNotice("Low-stock threshold must be a whole number ≥ 0.");
      return;
    }
    await guard(() => setStock(productId, variant.id, parsedQ, parsedT));
    setStockEdits((prev) => {
      const next = { ...prev };
      delete next[variant.id];
      return next;
    });
    setThresholdEdits((prev) => {
      const next = { ...prev };
      delete next[variant.id];
      return next;
    });
  }

  return (
    <div>
      {notice ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{notice}</p>
      ) : null}

      <ul className="divide-y divide-wine-900/10 rounded-2xl border border-wine-900/10">
        {variants.map((variant) => {
          const isDefault = variant.sku.endsWith("-DEFAULT");
          return (
            <li key={variant.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-44 flex-1">
                <span className="font-medium text-wine-900">
                  {variant.name ?? "Default"}
                </span>
                <span className="block text-xs text-wine-900/50">
                  {variant.sku}
                  {variant.sellingPricePaise !== null
                    ? ` · ₹${variant.sellingPricePaise / 100}`
                    : ""}
                </span>
              </div>

              <label className="text-xs text-wine-900/60">
                stock
                <input
                  value={stockEdits[variant.id] ?? String(variant.quantity)}
                  onChange={(e) =>
                    setStockEdits((prev) => ({ ...prev, [variant.id]: e.target.value }))
                  }
                  inputMode="numeric"
                  className="ml-1 w-16 rounded-md border border-wine-900/15 px-1.5 py-1"
                />
              </label>
              <label className="text-xs text-wine-900/60">
                low at
                <input
                  value={thresholdEdits[variant.id] ?? String(variant.lowStockThreshold)}
                  onChange={(e) =>
                    setThresholdEdits((prev) => ({ ...prev, [variant.id]: e.target.value }))
                  }
                  inputMode="numeric"
                  className="ml-1 w-14 rounded-md border border-wine-900/15 px-1.5 py-1"
                />
              </label>
              <button
                type="button"
                onClick={() => saveStock(variant)}
                className="rounded-full border border-wine-900/20 px-3 py-1 text-xs hover:border-gold-500"
              >
                save
              </button>

              {!isDefault ? (
                <button
                  type="button"
                  onClick={() =>
                    guard(() =>
                      updateVariant(productId, variant.id, { isActive: !variant.isActive }),
                    )
                  }
                  className="text-xs text-wine-900/70 hover:underline"
                >
                  {variant.isActive ? "deactivate" : "activate"}
                </button>
              ) : (
                <span className="text-[11px] text-wine-900/40">required (§3)</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='Variant name (e.g. "Blouse 34")'
          className="flex-1 min-w-40 rounded-full border border-wine-900/15 px-3 py-1.5 text-sm"
        />
        <input
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="price ₹ (optional)"
          inputMode="decimal"
          className="w-40 rounded-full border border-wine-900/15 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-full bg-wine-900 px-4 py-1.5 text-xs font-medium text-ivory-50 hover:bg-wine-800"
        >
          + Variant
        </button>
      </div>
      <p className="mt-2 text-[11px] text-wine-900/50">
        A product with no variants sells its DEFAULT variant; variants can carry
        independent stock (§15D).
      </p>
    </div>
  );
}
