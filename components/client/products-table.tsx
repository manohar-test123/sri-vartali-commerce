"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteProduct,
  duplicateProduct,
  setProductStatus,
} from "@/lib/catalog/actions";
import type { ProductListItem } from "@/lib/catalog/queries";
import { formatPaise } from "@/lib/catalog/money";

/** §14 list: search, image/name/code/price/stock/status, row actions. */
export function ProductsTable({
  products,
  search,
}: {
  products: ProductListItem[];
  search: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(search);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitSearch(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value.trim() === "") next.delete("q");
    else next.set("q", value.trim());
    router.replace(`/client/products?${next.toString()}`);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setNotice(done ?? null);
        router.refresh();
      } else {
        setNotice(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex-1 min-w-56"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch(query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-full border border-wine-900/15 bg-white px-4 py-2 text-sm text-wine-900 placeholder:text-wine-900/40 focus:border-gold-500 focus:outline-none"
          />
        </form>
        {pending ? <span className="text-xs text-wine-900/50">working…</span> : null}
      </div>

      {notice ? (
        <p className="mt-3 rounded-xl bg-gold-50 px-4 py-2 text-sm text-wine-900/80">
          {notice}
        </p>
      ) : null}

      {products.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-wine-900/20 px-6 py-12 text-center text-sm text-wine-900/60">
          No products yet — add your first one.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-wine-900/10 rounded-2xl border border-wine-900/10 bg-white">
          {products.map((p) => {
            const soldOut = p.status === "PUBLISHED" && p.stock === 0;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-wine-900/5">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <Link
                  href={`/client/products/${p.id}`}
                  className="min-w-40 flex-1 font-medium text-wine-900 hover:underline"
                >
                  {p.name}
                  <span className="block text-xs text-wine-900/50">
                    {p.productCode}
                  </span>
                </Link>
                <span className="w-20 text-sm text-wine-900/80">
                  {formatPaise(p.sellingPricePaise)}
                </span>
                <span
                  className={`w-14 text-sm ${p.stock === 0 ? "text-wine-900/40" : "text-wine-900/80"}`}
                >
                  {p.stock}
                </span>
                <span className="w-24">
                  <StatusBadge status={p.status} soldOut={soldOut} />
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-wine-900/70">
                  <Link href={`/client/products/${p.id}`} className="hover:underline">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() =>
                      run(
                        () => duplicateProduct(p.id, false),
                        `Duplicated ${p.productCode} as a new draft.`,
                      )
                    }
                  >
                    Duplicate
                  </button>
                  {p.status === "PUBLISHED" ? (
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() =>
                        run(() => setProductStatus(p.id, "unpublish"), "Unpublished.")
                      }
                    >
                      Unpublish
                    </button>
                  ) : null}
                  {p.status !== "ARCHIVED" ? (
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() =>
                        run(() => setProductStatus(p.id, "archive"), "Archived.")
                      }
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() =>
                        run(() => setProductStatus(p.id, "restore"), "Restored to draft.")
                      }
                    >
                      Restore
                    </button>
                  )}
                  {p.status === "DRAFT" ? (
                    <button
                      type="button"
                      className="text-red-700/70 hover:underline"
                      onClick={() => run(() => deleteProduct(p.id), "Deleted.")}
                    >
                      Delete
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
  soldOut,
}: {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  soldOut?: boolean;
}) {
  const styles =
    status === "PUBLISHED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "DRAFT"
        ? "bg-amber-100 text-amber-800"
        : "bg-wine-900/10 text-wine-900/60";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles}`}>
      {soldOut ? "SOLD OUT" : status}
    </span>
  );
}
