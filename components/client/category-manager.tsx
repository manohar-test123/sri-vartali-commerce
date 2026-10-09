"use client";

/**
 * §4/§41 category management: list + create/edit/delete with the attribute
 * schema authored as JSON (the wizard renders it — this is its source).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/dashboard/actions";
import type { CategoryListRow } from "@/lib/dashboard/queries";

const inputClass =
  "mt-1 w-full rounded-lg border border-wine-900/20 bg-white px-3 py-2 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-400 focus:outline-none disabled:bg-ivory-50 disabled:text-wine-900/40";

export function CategoryManager({
  categories,
  canEdit,
}: {
  categories: CategoryListRow[];
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
          {categories.length} categor{categories.length === 1 ? "y" : "ies"} · structural
          product types (Sarees, Dresses…) whose attribute schemas drive the product wizard.
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
            {creating ? "Close" : "New category"}
          </button>
        ) : null}
      </div>

      {creating && canEdit ? (
        <CategoryForm
          categories={categories}
          pending={pending}
          onCancel={() => setCreating(false)}
          onSubmit={(form) =>
            run(() => createCategory(form), "Category created.")
          }
        />
      ) : null}

      <ul className="mt-6 space-y-3">
        {categories.map((category) => (
          <li key={category.id} className="rounded-xl border border-wine-900/15 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-wine-900">
                  {category.name}
                  {!category.isActive ? (
                    <span className="ml-2 rounded-full border border-wine-900/20 px-2 py-0.5 text-[11px] font-medium text-wine-900/50">
                      hidden
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-wine-900/60">
                  /{category.slug}
                  {category.parentName ? ` · under ${category.parentName}` : " · top level"} ·{" "}
                  {category.productCount} product{category.productCount === 1 ? "" : "s"} ·{" "}
                  {category.attributeSchemaText === "[]" ? "no schema" : "schema set"}
                </p>
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(editingId === category.id ? null : category.id);
                      setCreating(false);
                    }}
                    className="rounded-full border border-wine-900/25 px-4 py-1.5 text-sm text-wine-900 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                  >
                    {editingId === category.id ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete “${category.name}”?${category.productCount > 0 ? ` ${category.productCount} product(s) still use it — delete will be refused until they are moved.` : ""}`,
                        )
                      ) {
                        run(() => deleteCategory(category.id), "Category deleted.");
                      }
                    }}
                    className="rounded-full border border-red-200 px-4 py-1.5 text-sm text-red-800 transition-colors hover:border-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>

            {editingId === category.id && canEdit ? (
              <CategoryForm
                categories={categories}
                pending={pending}
                initial={category}
                onCancel={() => setEditingId(null)}
                onSubmit={(form) =>
                  run(
                    () => updateCategory(category.id, form),
                    "Category saved.",
                  )
                }
              />
            ) : null}
          </li>
        ))}
      </ul>

      {categories.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center text-sm text-wine-900/50">
          No categories yet — create the first one to start the catalog.
        </p>
      ) : null}
    </div>
  );
}

function CategoryForm({
  categories,
  pending,
  initial,
  onCancel,
  onSubmit,
}: {
  categories: CategoryListRow[];
  pending: boolean;
  initial?: CategoryListRow;
  onCancel: () => void;
  onSubmit: (form: FormData) => void;
}) {
  // A category's parent options exclude itself and its descendants.
  const forbidden = new Set<string>(initial ? [initial.id] : []);
  if (initial) {
    const byParent = new Map<string, string[]>();
    for (const c of categories) {
      const list = byParent.get(c.parentId ?? "") ?? [];
      list.push(c.id);
      byParent.set(c.parentId ?? "", list);
    }
    const stack = [initial.id];
    while (stack.length > 0) {
      const id = stack.pop()!;
      forbidden.add(id);
      for (const child of byParent.get(id) ?? []) stack.push(child);
    }
  }
  const parentOptions = categories.filter((c) => !forbidden.has(c.id));

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
        </label>
        <label className="block text-sm font-medium text-wine-900">
          Parent category
          <select
            name="parentId"
            defaultValue={initial?.parentId ?? ""}
            disabled={pending}
            className={inputClass}
          >
            <option value="">Top level</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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

      <label className="block text-sm font-medium text-wine-900">
        Attribute schema (JSON)
        <textarea
          name="attributeSchema"
          defaultValue={initial?.attributeSchemaText ?? "[]"}
          rows={6}
          spellCheck={false}
          disabled={pending}
          className={`${inputClass} font-mono text-xs`}
        />
        <span className="mt-1 block text-xs font-normal leading-5 text-wine-900/50">
          Fields the product wizard renders for this category, e.g.
          {" "}[{`{"key":"fabric","label":"Fabric","type":"text"`}
          {", "}{`"filterable":true}`}] — empty array is fine. Existing
          products keep values keyed by <code>key</code>, so never rename a
          key that is in use.
        </span>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-wine-900 px-6 py-2 text-sm text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : initial ? "Save category" : "Create category"}
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
