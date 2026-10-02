/**
 * Catalog type definitions (spec §3-§4, §15-§17).
 *
 * Mirrors the v1 schema in supabase/migrations/ — keep both in sync. The
 * catalog is category-generic: per-category fields live in
 * `categories.attribute_schema` and their values in `products.attributes`,
 * both as jsonb.
 */

/** One field definition inside a category's attribute_schema. */
export interface CategoryAttributeField {
  key: string;
  label: string;
  type: "text" | "option" | "boolean";
  /** Option fields carry their allowed values. */
  options?: string[];
  /** Reserved for future seeds — no v1 seed marks a field required yet. */
  required?: boolean;
  /** Drives catalog filters later; unused by validation. */
  filterable?: boolean;
}

/** A category's attribute_schema is an (possibly empty) array of fields. */
export type CategoryAttributeSchema = CategoryAttributeField[];

/** Values keyed by field key — what `products.attributes` stores. */
export type AttributeValues = Record<string, string | boolean>;

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Public availability (§16): zero stock is SOLD_OUT, never a page removal. */
export type Availability = "IN_STOCK" | "SOLD_OUT" | "UNAVAILABLE";

/** Mirrors `public.products` columns relevant to the catalog engine. */
export interface ProductRow {
  id: string;
  product_code: string;
  name: string;
  slug: string;
  category_id: string;
  short_description: string | null;
  description: string | null;
  status: ProductStatus;
  selling_price_paise: number;
  mrp_paise: number | null;
  attributes: AttributeValues;
  measurements: Record<string, unknown>;
  care_instructions: string | null;
  seo_title: string | null;
  seo_description: string | null;
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  dispatch_time_days: number;
  return_eligible: boolean;
  shipping_notes: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Mirrors `public.product_variants`. */
export interface ProductVariantRow {
  id: string;
  product_id: string;
  sku: string;
  name: string | null;
  attributes: AttributeValues;
  selling_price_paise: number | null;
  mrp_paise: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Mirrors `public.inventory`. */
export interface InventoryRow {
  id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
}

/** Mirrors `public.product_media`. */
export interface ProductMediaRow {
  id: string;
  product_id: string;
  cloudinary_public_id: string | null;
  url: string;
  alt: string | null;
  position: number;
  is_primary: boolean;
  created_at: string;
}
