/**
 * §40 filter panel: one GET form (no JavaScript required) carrying q and any
 * locked scope (collection), with checkbox facets for colour / occasion /
 * fabric, price bounds, availability and sort. Checkbox values ride the same
 * repeatable params the pure engine parses.
 */

import Link from "next/link";

import {
  buildQuery,
  type AttributeFacetField,
  type CategoryNode,
} from "@/lib/storefront/search";
import type { CatalogFilters, CatalogSort } from "@/lib/storefront/types";

const SORT_LABELS: Record<CatalogSort, string> = {
  newest: "Newest first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  name: "Name A–Z",
};

function CheckRow({
  name,
  value,
  checked,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm text-wine-900/80 hover:text-wine-900">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="h-3.5 w-3.5 accent-wine-700"
      />
      {label}
    </label>
  );
}

export function FiltersPanel({
  basePath,
  filters,
  facets,
  attributeFacets,
  categories,
  collections,
  lockedCategory,
  lockedCollection,
}: {
  basePath: string;
  filters: CatalogFilters;
  facets: { colors: string[]; occasions: string[]; fabrics: string[] };
  /** §40 category-specific groups generated from attribute schemas. */
  attributeFacets: Array<AttributeFacetField & { values: string[] }>;
  categories: CategoryNode[];
  /** Active collections for the §40 collection filter. */
  collections: Array<{ slug: string; name: string }>;
  /** Category pages lock their scope: no category picker inside. */
  lockedCategory?: boolean;
  /** Collection pages lock their scope: no collection picker inside. */
  lockedCollection?: boolean;
}) {
  const hasAny =
    filters.colors.length > 0 ||
    filters.occasions.length > 0 ||
    filters.fabrics.length > 0 ||
    Object.values(filters.attributeFilters).some((v) => v.length > 0) ||
    filters.minPricePaise !== null ||
    filters.maxPricePaise !== null ||
    filters.inStockOnly ||
    (!lockedCategory && filters.categorySlug !== null) ||
    (!lockedCollection && filters.collectionSlug !== null);

  return (
    <form
      action={basePath}
      method="get"
      className="space-y-5 rounded-2xl border border-wine-900/10 bg-white/60 p-4"
      aria-label="Filter products"
    >
      {filters.q !== "" ? (
        <input type="hidden" name="q" value={filters.q} />
      ) : null}
      {lockedCollection && filters.collectionSlug ? (
        <input type="hidden" name="collection" value={filters.collectionSlug} />
      ) : null}
      {lockedCategory && filters.categorySlug ? (
        <input type="hidden" name="category" value={filters.categorySlug} />
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="filter-min"
            className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-wine-900/50"
          >
            Price min (₹)
          </label>
          <input
            id="filter-min"
            type="number"
            name="min"
            min={0}
            step={100}
            defaultValue={filters.minPricePaise !== null ? filters.minPricePaise / 100 : ""}
            className="w-full rounded-lg border border-wine-900/15 bg-white px-2.5 py-1.5 text-sm focus:border-gold-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="filter-max"
            className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-wine-900/50"
          >
            Price max (₹)
          </label>
          <input
            id="filter-max"
            type="number"
            name="max"
            min={0}
            step={100}
            defaultValue={filters.maxPricePaise !== null ? filters.maxPricePaise / 100 : ""}
            className="w-full rounded-lg border border-wine-900/15 bg-white px-2.5 py-1.5 text-sm focus:border-gold-500 focus:outline-none"
          />
        </div>
      </div>

      <CheckRow
        name="stock"
        value="in_stock"
        checked={filters.inStockOnly}
        label="In stock only"
      />

      {!lockedCategory ? (
        <fieldset>
          <legend className="mb-1 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Category
          </legend>
          <label className="sr-only" htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            name="category"
            defaultValue={filters.categorySlug ?? ""}
            className="w-full rounded-lg border border-wine-900/15 bg-white px-2.5 py-1.5 text-sm focus:border-gold-500 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories
              .filter((c) => c.parentId === null)
              .map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
          </select>
        </fieldset>
      ) : null}

      {!lockedCollection && collections.length > 0 ? (
        <fieldset>
          <legend className="mb-1 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Collection
          </legend>
          <label className="sr-only" htmlFor="filter-collection">
            Collection
          </label>
          <select
            id="filter-collection"
            name="collection"
            defaultValue={filters.collectionSlug ?? ""}
            className="w-full rounded-lg border border-wine-900/15 bg-white px-2.5 py-1.5 text-sm focus:border-gold-500 focus:outline-none"
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="mb-1 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Colour
        </legend>
        {facets.colors.length === 0 ? (
          <p className="text-xs text-wine-900/40">—</p>
        ) : (
          facets.colors.map((c) => (
            <CheckRow
              key={c}
              name="color"
              value={c}
              checked={filters.colors.includes(c)}
              label={c}
            />
          ))
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Fabric / Material
        </legend>
        {facets.fabrics.length === 0 ? (
          <p className="text-xs text-wine-900/40">—</p>
        ) : (
          facets.fabrics.map((f) => (
            <CheckRow
              key={f}
              name="fabric"
              value={f}
              checked={filters.fabrics.includes(f)}
              label={f}
            />
          ))
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Occasion
        </legend>
        {facets.occasions.length === 0 ? (
          <p className="text-xs text-wine-900/40">—</p>
        ) : (
          facets.occasions.map((o) => (
            <CheckRow
              key={o}
              name="occasion"
              value={o}
              checked={filters.occasions.includes(o)}
              label={o}
            />
          ))
        )}
      </fieldset>

      {attributeFacets.map((group) => (
        <fieldset key={group.key}>
          <legend className="mb-1 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            {group.label}
          </legend>
          {group.values.map((v) => (
            <CheckRow
              key={v}
              name={`f_${group.key}`}
              value={v}
              checked={filters.attributeFilters[group.key]?.includes(v) ?? false}
              label={v}
            />
          ))}
        </fieldset>
      ))}

      <div className="flex items-center justify-between gap-3 border-t border-wine-900/10 pt-4">
        <div className="flex-1">
          <label
            htmlFor="filter-sort"
            className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-wine-900/50"
          >
            Sort
          </label>
          <select
            id="filter-sort"
            name="sort"
            defaultValue={filters.sort}
            className="w-full rounded-lg border border-wine-900/15 bg-white px-2.5 py-1.5 text-sm focus:border-gold-500 focus:outline-none"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="flex-1 rounded-full bg-wine-900 px-4 py-2 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-800"
        >
          Apply
        </button>
        {hasAny ? (
          <Link
            href={`${basePath}${buildQuery(filters, {
              colors: [],
              occasions: [],
              fabrics: [],
              attributeFilters: {},
              minPricePaise: null,
              maxPricePaise: null,
              inStockOnly: false,
              categorySlug: lockedCategory ? filters.categorySlug : null,
              collectionSlug: lockedCollection
                ? filters.collectionSlug
                : null,
              sort: filters.sort,
              page: 1,
            })}`}
            className="text-xs text-wine-900/60 underline hover:text-wine-900"
          >
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}
