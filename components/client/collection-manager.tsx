"use client";

/**
 * §41 collection management: marketing groupings (Festive Edit, Wedding
 * Edit…) with create/edit/delete and product membership — the storefront
 * /collections/[slug] pages read exactly this data.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addProductToCollection,
  createCollection,
  deleteCollection,
  removeProductFromCollection,
  updateCollection,
} from "@/lib/dashboard/actions";
import type { CollectionListRow } from "@/lib/dashboard/queries";
import type { CollectionProductRow } from "@/lib/dashboard/queries";

const inputClass =
  "mt-1 w-full rounded-lg border border-wine-900/20 bg-white px-3 py-2 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-400 focus:outline-none disabled:bg-ivory-50 disabled:text-wine-900/40";

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "border-emerald-200 text-emerald-800",
  DRAFT: "border-amber-200 text-amber-800",
  ARCHIVED: "border-wine-900/20 text-wine-900/50",
};

export function CollectionManager({
  collections,
  products,
  canEdit,
}: {
  collections: CollectionListRow[];
  products: Array<{ id: string; name: string; productCode: string; status: string }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMessage: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setNotice(okMessage);
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-wine-900/60">
          {collections.length} collection{collections.length === 1 ? "" : "s"} · editorial
          groupings that cut across categories (Festive Edit, Wedding Edit…).
        </p>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              setCreating((v) => !v);
              setEditingId(null);
            }}
            className="rounded-full bg-wine-900 px-4 py-2 text-sm text-ivory-50 transition-colors hover:bg-wine-800"
          >
            {creating ? "Close" : "New collection"}
          </button>
        ) : null}
      </div>

      {creating && canEdit ? (
        <CollectionForm
          pending={pending}
          onCancel={() => setCreating(false)}
          onSubmit={(form) => run(() => createCollection(form), "Collection created.")}
        />
      ) : null}

      <ul className="mt-6 space-y-3">
        {collections.map((collection) => (
          <li key={collection.id} className="rounded-xl border border-wine-900/15 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-wine-900">
                  {collection.name}
                  {!collection.isActive ? (
                    <span className="ml-2 rounded-full border border-wine-900/20 px-2 py-0.5 text-[11px] font-medium text-wine-900/50">
                      hidden
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-wine-900/60">
                  /collections/{collection.slug} · {collection.productCount} product
                  {collection.productCount === 1 ? "" : "s"}
                  {collection.description ? ` · ${collection.description}` : ""}
                </p>
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(editingId === collection.id ? null : collection.id);
                      setCreating(false);
                    }}
                    className="rounded-full border border-wine-900/25 px-4 py-1.5 text-sm text-wine-900 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                  >
                    {editingId === collection.id ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete “${collection.name}”? Products in it are not deleted — only the grouping goes.`,
                        )
                      ) {
                        run(() => deleteCollection(collection.id), "Collection deleted.");
                      }
                    }}
                    className="rounded-full border border-red-200 px-4 py-1.5 text-sm text-red-800 transition-colors hover:border-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-3">
              <ProductChips
                collection={collection}
                canEdit={canEdit}
                pending={pending}
                onRemove={(productId) =>
                  run(
                    () => removeProductFromCollection(collection.id, productId),
                    "Product removed.",
                  )
                }
              />
            </div>

            {editingId === collection.id && canEdit ? (
              <CollectionForm
                pending={pending}
                initial={collection}
                onCancel={() => setEditingId(null)}
                onSubmit={(form) =>
                  run(() => updateCollection(collection.id, form), "Collection saved.")
                }
              />
            ) : null}

            {canEdit ? (
              <AddProductRow
                collection={collection}
                products={products}
                pending={pending}
                onAdd={(productId) =>
                  run(() => addProductToCollection(collection.id, productId), "Product added.")
                }
              />
            ) : null}
          </li>
        ))}
      </ul>

      {collections.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center text-sm text-wine-900/50">
          No collections yet — create one to group products editorially.
        </p>
      ) : null}
    </div>
  );
}

function ProductChips({
  collection,
  canEdit,
  pending,
  onRemove,
}: {
  collection: CollectionListRow;
  canEdit: boolean;
  pending: boolean;
  onRemove: (productId: string) => void;
}) {
  if (collection.products.length === 0) {
    return (
      <p className="text-xs text-wine-900/40">No products in this collection yet.</p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`Products in ${collection.name}`}>
      {collection.products.map((p: CollectionProductRow) => (
        <li
          key={p.productId}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
            STATUS_STYLES[p.status] ?? "border-wine-900/20 text-wine-900/70"
          }`}
        >
          <span className="font-medium">{p.name}</span>
          <span className="opacity-60">{p.productCode}</span>
          {canEdit ? (
            <button
              type="button"
              disabled={pending}
              aria-label={`Remove ${p.name} from ${collection.name}`}
              onClick={() => onRemove(p.productId)}
              className="rounded-full px-1 leading-none text-wine-900/50 transition-colors hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 disabled:opacity-50"
            >
              ×
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AddProductRow({
  collection,
  products,
  pending,
  onAdd,
}: {
  collection: CollectionListRow;
  products: Array<{ id: string; name: string; productCode: string; status: string }>;
  pending: boolean;
  onAdd: (productId: string) => void;
}) {
  const members = new Set(collection.products.map((p) => p.productId));
  const options = products.filter((p) => !members.has(p.id));
  const [selected, setSelected] = useState("");

  if (options.length === 0) return null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selected) {
          onAdd(selected);
          setSelected("");
        }
      }}
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      <label className="text-xs text-wine-900/60" htmlFor={`add-${collection.id}`}>
        Add product
      </label>
      <select
        id={`add-${collection.id}`}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        disabled={pending}
        className="rounded-lg border border-wine-900/20 bg-white px-2 py-1.5 text-sm text-wine-900 focus:border-gold-400 focus:outline-none disabled:opacity-50"
      >
        <option value="">Choose a product…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.productCode})
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || selected === ""}
        className="rounded-full border border-wine-900/25 px-4 py-1.5 text-sm text-wine-900 transition-colors hover:border-gold-400 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

function CollectionForm({
  pending,
  initial,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  initial?: CollectionListRow;
  onCancel: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
      className="mt-4 space-y-4 rounded-xl border border-gold-200 bg-gold-50/40 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-wine-900">
          Name
          <input
            type="text"
            name="name"
            defaultValue={initial?.name ?? ""}
            required
            maxLength={80}
            disabled={pending}
            className={inputClass}
          />
          {initial ? (
            <span className="mt-1 block text-xs font-normal text-wine-900/50">
              The URL slug /{initial.slug} stays stable — renaming never breaks links.
            </span>
          ) : null}
        </label>
        <label className="block text-sm font-medium text-wine-900">
          Position (lower shows first)
          <input
            type="number"
            name="position"
            min={0}
            step={1}
            defaultValue={initial?.position ?? 0}
            disabled={pending}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-wine-900">
          Visible in store
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initial ? initial.isActive : true}
            disabled={pending}
            className="mt-3 block h-4 w-4 rounded border-wine-900/30 accent-wine-900"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-wine-900">
        Description
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={2}
          maxLength={300}
          disabled={pending}
          className={inputClass}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-wine-900 px-6 py-2 text-sm text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : initial ? "Save collection" : "Create collection"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-full border border-wine-900/25 px-6 py-2 text-sm text-wine-900 transition-colors hover:border-wine-900/40 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
