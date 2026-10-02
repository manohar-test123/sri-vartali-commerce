/**
 * Public storefront types (spec §11-§13, §40-§41).
 *
 * Everything here is serializable: the same summary shape crosses server
 * component boundaries and (for the guest wishlist) localStorage, so no
 * Date/Map/etc. — strings and integers only.
 */

import type { AttributeValues, Availability } from "@/lib/catalog/types";

/** One card-sized image reference. */
export interface CardImage {
  url: string;
  alt: string;
}

/**
 * A product as the public store sees it (§12 card + listing rows).
 * `availablePaise`-style names never appear — money is paise integers only.
 */
export interface StoreProductSummary {
  id: string;
  slug: string;
  name: string;
  productCode: string;
  categorySlug: string;
  categoryName: string | null;
  /** Top-level (parent) category name, when the category is a subcategory. */
  categoryParentName: string | null;
  /** Variant SKUs (§40 search matches them). */
  skus: string[];
  pricePaise: number;
  mrpPaise: number | null;
  images: CardImage[];
  /** Attribute cue shown on cards (§12 "color / material"). */
  colorLabel: string | null;
  materialLabel: string | null;
  availability: Availability;
  lowStock: boolean;
  isNew: boolean;
  publishedAt: string | null;
  /** Attribute values for facets/filters (§40) and the product page. */
  attributes: AttributeValues;
  /** Collection slugs this product belongs to (§41). */
  collectionSlugs: string[];
  /** Approved-review aggregate; null when the product has no reviews yet. */
  rating: { average: number; count: number } | null;
}

/** Sort orders offered on listing pages. */
export type CatalogSort = "newest" | "price_asc" | "price_desc" | "name";

/** Parsed URL filter state (§40) — arrays mean OR-within a dimension. */
export interface CatalogFilters {
  q: string;
  /** Category slug; matches the category AND its descendants. */
  categorySlug: string | null;
  collectionSlug: string | null;
  colors: string[];
  occasions: string[];
  /** Matches `fabric` OR `material` attribute values. */
  fabrics: string[];
  /** Rupee bounds parsed to paise; null = unbounded. */
  minPricePaise: number | null;
  maxPricePaise: number | null;
  inStockOnly: boolean;
  sort: CatalogSort;
  page: number;
}

/** A facet option rendered in the filter panel. */
export interface FacetOption {
  value: string;
  /** Stable href suffix for this option on its dimension. */
  toggleHref: string;
  checked: boolean;
}

/** A facet group (one §40 dimension) rendered in the filter panel. */
export interface FacetGroup {
  key: "category" | "color" | "occasion" | "fabric";
  label: string;
  options: FacetOption[];
}

export const PAGE_SIZE = 24;
