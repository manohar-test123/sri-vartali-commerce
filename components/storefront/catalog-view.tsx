/**
 * Shared listing surface for /shop, /search, /category/[slug] and
 * /collections/[slug]: URL filters (§40) → pure engine → filter panel +
 * result count + grid + pagination. Server component; the panel is a GET
 * form, so the whole listing works without JavaScript.
 */

import Link from "next/link";

import { FiltersPanel } from "@/components/storefront/filters-panel";
import { FiltersSheet } from "@/components/storefront/filters-sheet";
import { ProductGrid } from "@/components/storefront/product-grid";
import { cardDataFromSummary } from "@/components/storefront/product-card";
import {
  buildQuery,
  distinctAttributeValues,
  filterProducts,
  paginate,
  parseFilters,
  sortProducts,
} from "@/lib/storefront/search";
import {
  listPublishedProducts,
  listStorefrontCategories,
} from "@/lib/storefront/queries";

export interface CatalogViewScope {
  categorySlug?: string;
  /** Hide the category picker (a category page IS its scope). */
  lockedCategory?: boolean;
  collectionSlug?: string;
}

export async function CatalogView({
  basePath,
  params,
  scope = {},
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  scope?: CatalogViewScope;
}) {
  const filters = parseFilters(params);
  if (scope.categorySlug) filters.categorySlug = scope.categorySlug;
  if (scope.collectionSlug) filters.collectionSlug = scope.collectionSlug;

  const [products, categories] = await Promise.all([
    listPublishedProducts(),
    listStorefrontCategories(),
  ]);

  // Facet vocabulary comes from the scope itself (all of Sarees, say),
  // so options never disappear because another facet is active.
  const scoped = filterProducts(products, { ...filters, colors: [], occasions: [], fabrics: [], minPricePaise: null, maxPricePaise: null, inStockOnly: false, q: "", page: 1 }, categories);
  const facets = {
    colors: distinctAttributeValues(scoped, ["color"]),
    occasions: distinctAttributeValues(scoped, ["occasion"]),
    fabrics: distinctAttributeValues(scoped, ["fabric", "material"]),
  };

  const filtered = filterProducts(products, filters, categories);
  const sorted = sortProducts(filtered, filters.sort);
  const page = paginate(sorted, filters.page);

  // §48: sidebar on desktop, bottom-sheet on mobile. The panel itself is the
  // same GET form in both places; without JavaScript the sidebar comes back
  // (noscript override below), so filtering never depends on JS.
  const activeFilterCount =
    filters.colors.length +
    filters.occasions.length +
    filters.fabrics.length +
    (filters.minPricePaise !== null ? 1 : 0) +
    (filters.maxPricePaise !== null ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (!scope.lockedCategory && filters.categorySlug !== null ? 1 : 0);
  const panel = (
    <FiltersPanel
      basePath={basePath}
      filters={filters}
      facets={facets}
      categories={categories}
      lockedCategory={scope.lockedCategory}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <noscript>
        {/* The mobile sheet needs JS — without it the sidebar stays put. */}
        <style>{`.filters-aside { display: block !important; }`}</style>
      </noscript>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="filters-aside hidden lg:block">{panel}</aside>

        <div>
          <div className="mb-4 lg:hidden">
            <FiltersSheet activeCount={activeFilterCount}>{panel}</FiltersSheet>
          </div>

          <p className="mb-4 text-sm text-wine-900/60" aria-live="polite">
            {page.total === 0
              ? "No pieces match"
              : `${page.total} ${page.total === 1 ? "piece" : "pieces"}`}
            {filters.q !== "" ? <> for “{filters.q}”</> : null}
          </p>

          <ProductGrid products={page.items.map(cardDataFromSummary)} />

          {page.pageCount > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-10 flex items-center justify-center gap-2 text-sm"
            >
              {page.page > 1 ? (
                <Link
                  href={`${basePath}${buildQuery(filters, { page: page.page - 1 })}`}
                  className="rounded-full border border-wine-900/15 px-3 py-1.5 hover:border-wine-900/40"
                >
                  ← Previous
                </Link>
              ) : null}
              {Array.from({ length: page.pageCount }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`${basePath}${buildQuery(filters, { page: n })}`}
                  aria-current={n === page.page ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 ${
                    n === page.page
                      ? "bg-wine-900 text-ivory-50"
                      : "border border-wine-900/15 hover:border-wine-900/40"
                  }`}
                >
                  {n}
                </Link>
              ))}
              {page.page < page.pageCount ? (
                <Link
                  href={`${basePath}${buildQuery(filters, { page: page.page + 1 })}`}
                  className="rounded-full border border-wine-900/15 px-3 py-1.5 hover:border-wine-900/40"
                >
                  Next →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
