/**
 * Public catalog search/filter/facet engine (spec §40).
 *
 * Pure functions over an in-memory list of published products. The launch
 * catalog is small (dozens of SKUs), so the listing pages fetch the published
 * set once per request — RLS already scopes what anon may see — and this
 * module does the dimensional work. When the catalog outgrows a single
 * fetch, these functions keep their shape and move behind a SQL boundary.
 */

import type {
  CatalogFilters,
  CatalogSort,
  StoreProductSummary,
} from "@/lib/storefront/types";
import { PAGE_SIZE } from "@/lib/storefront/types";

/** Flat category list as fetched for nav/facets. */
export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
}

const SORTS: CatalogSort[] = ["newest", "price_asc", "price_desc", "name"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.map((v) => v.trim()).filter((v) => v !== "");
}

/** Rupee string → paise; null when absent or not a positive integer amount. */
function rupeesToPaise(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const cleaned = value.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0") || "0");
  return paise > 0 ? paise : null;
}

/** `?color=Wine&color=Ivory&sort=price_asc` → typed filters. */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): CatalogFilters {
  const sortRaw = first(params.sort) as CatalogSort | undefined;
  const pageRaw = Number(first(params.page) ?? "1");
  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    categorySlug: first(params.category)?.trim() || null,
    collectionSlug: first(params.collection)?.trim() || null,
    colors: list(params.color),
    occasions: list(params.occasion),
    fabrics: list(params.fabric),
    minPricePaise: rupeesToPaise(first(params.min)),
    maxPricePaise: rupeesToPaise(first(params.max)),
    inStockOnly: first(params.stock) === "in_stock",
    sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : "newest",
    page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

/** Serialize filters to a query string, applying a partial override. */
export function buildQuery(
  filters: CatalogFilters,
  patch: Partial<CatalogFilters> = {},
): string {
  const f = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (f.q !== "") params.set("q", f.q);
  if (f.categorySlug) params.set("category", f.categorySlug);
  if (f.collectionSlug) params.set("collection", f.collectionSlug);
  for (const c of f.colors) params.append("color", c);
  for (const o of f.occasions) params.append("occasion", o);
  for (const b of f.fabrics) params.append("fabric", b);
  if (f.minPricePaise !== null) params.set("min", String(f.minPricePaise / 100));
  if (f.maxPricePaise !== null) params.set("max", String(f.maxPricePaise / 100));
  if (f.inStockOnly) params.set("stock", "in_stock");
  if (f.sort !== "newest") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  const qs = params.toString();
  return qs === "" ? "" : `?${qs}`;
}

/** Toggle one value inside a repeatable dimension (facet links). */
function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

/** All descendant slugs of `slug` within the flat list, plus itself. */
export function categoryScope(
  categories: CategoryNode[],
  slug: string,
): Set<string> {
  const scope = new Set<string>([slug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId === null || scope.has(c.slug)) continue;
      // hoist parent slug via id → slug lookup
      const parentSlug = categories.find((p) => p.id === c.parentId)?.slug;
      if (parentSlug !== undefined && scope.has(parentSlug)) {
        scope.add(c.slug);
        grew = true;
      }
    }
  }
  return scope;
}

function attributeValues(p: StoreProductSummary): string[] {
  return Object.values(p.attributes).filter(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
}

/** §40 free text: name, product ID, SKU, category, fabric/color/occasion. */
export function matchesQuery(p: StoreProductSummary, q: string): boolean {
  const tokens = q.toLowerCase().split(/\s+/).filter((t) => t !== "");
  if (tokens.length === 0) return true;
  const haystack = [
    p.name,
    p.productCode,
    p.categoryName ?? "",
    p.categoryParentName ?? "",
    ...p.skus,
    ...attributeValues(p),
    ...p.collectionSlugs,
  ]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

/** Apply every §40 dimension to the published set. */
export function filterProducts(
  products: StoreProductSummary[],
  filters: CatalogFilters,
  categories: CategoryNode[],
): StoreProductSummary[] {
  const scope =
    filters.categorySlug !== null
      ? categoryScope(categories, filters.categorySlug)
      : null;

  return products.filter((p) => {
    if (scope !== null && !scope.has(p.categorySlug)) return false;
    if (
      filters.collectionSlug !== null &&
      !p.collectionSlugs.includes(filters.collectionSlug)
    ) {
      return false;
    }
    if (filters.colors.length > 0 && !filters.colors.includes(p.colorLabel ?? "")) {
      return false;
    }
    const occasion =
      typeof p.attributes.occasion === "string" ? p.attributes.occasion : "";
    if (filters.occasions.length > 0 && !filters.occasions.includes(occasion)) {
      return false;
    }
    const fabric =
      typeof p.attributes.fabric === "string" ? p.attributes.fabric : "";
    if (
      filters.fabrics.length > 0 &&
      !filters.fabrics.some((f) => f === p.materialLabel || f === fabric)
    ) {
      return false;
    }
    if (filters.minPricePaise !== null && p.pricePaise < filters.minPricePaise) {
      return false;
    }
    if (filters.maxPricePaise !== null && p.pricePaise > filters.maxPricePaise) {
      return false;
    }
    if (filters.inStockOnly && p.availability !== "IN_STOCK") return false;
    if (!matchesQuery(p, filters.q)) return false;
    return true;
  });
}

/** Sort a filtered set (§40 orderings). */
export function sortProducts(
  products: StoreProductSummary[],
  sort: CatalogSort,
): StoreProductSummary[] {
  const sorted = [...products];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.pricePaise - b.pricePaise);
    case "price_desc":
      return sorted.sort((a, b) => b.pricePaise - a.pricePaise);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
    default:
      return sorted.sort((a, b) =>
        (b.publishedAt ?? b.id).localeCompare(a.publishedAt ?? a.id),
      );
  }
}

export interface Paged<T> {
  items: T[];
  total: number;
  pageCount: number;
  page: number;
}

export function paginate<T>(items: T[], page: number): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  return {
    items: items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    total: items.length,
    pageCount,
    page: safePage,
  };
}

/** Distinct non-empty values of one attribute key across a set. */
export function distinctAttributeValues(
  products: StoreProductSummary[],
  keys: string[],
): string[] {
  const seen = new Set<string>();
  for (const p of products) {
    for (const key of keys) {
      const v = p.attributes[key];
      if (typeof v === "string" && v.trim() !== "") seen.add(v.trim());
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export { toggleValue };
