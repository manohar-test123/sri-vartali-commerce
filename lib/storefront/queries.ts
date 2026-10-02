/**
 * Storefront reads (spec §11-§13, §40-§41).
 *
 * Server-only. Every query rides the caller's session (anon included), so
 * RLS is the single gate: the public sees PUBLISHED products, active
 * categories/collections, and approved reviews — nothing more (rule 21).
 *
 * The launch catalog is small; listing pages load the whole published set
 * (bounded at 500) and hand it to the pure engine in search.ts.
 */

import { createClient as createServerClient } from "@/lib/db/server";

import type { CategoryNode } from "@/lib/storefront/search";
import type { CardImage, StoreProductSummary } from "@/lib/storefront/types";
import type {
  AttributeValues,
  Availability,
  ProductMediaRow,
  ProductRow,
} from "@/lib/catalog/types";

export type { CategoryNode };

const NEW_WINDOW_DAYS = 30;
const LIST_LIMIT = 500;

interface RawCategoryEmbed {
  slug: string;
  name: string;
  parent_id: string | null;
}

interface RawProductRow {
  id: string;
  slug: string;
  name: string;
  product_code: string;
  selling_price_paise: number;
  mrp_paise: number | null;
  attributes: AttributeValues;
  published_at: string | null;
  created_at: string;
  /** PostgREST returns the parent embed as an object or a single-element array. */
  category: RawCategoryEmbed | RawCategoryEmbed[];
  product_media: Array<{ url: string; alt: string | null; position: number; is_primary: boolean }>;
  product_variants: Array<{ sku: string; is_active: boolean }>;
  inventory: Array<{
    quantity: number;
    reserved_quantity: number;
    low_stock_threshold: number;
  }>;
  collection_products: Array<{ collection_id: string }>;
}

function embedded<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

interface RawCollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  product_count?: number;
}

/** Approved-review aggregates for a set of products, keyed by product id. */
async function ratingAggregates(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  productIds: string[],
): Promise<Map<string, { average: number; count: number }>> {
  const out = new Map<string, { average: number; count: number }>();
  if (productIds.length === 0) return out;

  const { data, error } = await supabase
    .from("reviews")
    .select("product_id, rating")
    .eq("is_approved", true)
    .in("product_id", productIds);
  if (error) throw new Error(`reviews: ${error.message}`);

  const sums = new Map<string, { total: number; count: number }>();
  for (const r of data ?? []) {
    const acc = sums.get(r.product_id) ?? { total: 0, count: 0 };
    acc.total += r.rating;
    acc.count += 1;
    sums.set(r.product_id, acc);
  }
  for (const [productId, { total, count }] of sums) {
    out.set(productId, {
      average: Math.round((total / count) * 10) / 10,
      count,
    });
  }
  return out;
}

function cardImages(media: RawProductRow["product_media"]): CardImage[] {
  const ordered = [...(media ?? [])].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
  );
  return ordered.map((m) => ({ url: m.url, alt: m.alt ?? "" }));
}

function availabilityOf(
  inventory: RawProductRow["inventory"],
): { availability: Availability; lowStock: boolean } {
  let available = 0;
  let threshold = Number.MAX_SAFE_INTEGER;
  for (const inv of inventory ?? []) {
    available += Math.max(inv.quantity - inv.reserved_quantity, 0);
    threshold = Math.min(threshold, inv.low_stock_threshold);
  }
  if ((inventory ?? []).length === 0) {
    return { availability: "UNAVAILABLE", lowStock: false };
  }
  if (available === 0) return { availability: "SOLD_OUT", lowStock: false };
  return {
    availability: "IN_STOCK",
    lowStock: available <= threshold,
  };
}

function isNew(publishedAt: string | null): boolean {
  if (publishedAt === null) return false;
  const ageDays =
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays >= 0 && ageDays <= NEW_WINDOW_DAYS;
}

function toSummary(
  row: RawProductRow,
  collectionSlugById: Map<string, string>,
  categoryById: Map<string, { name: string; parentId: string | null }>,
  rating: { average: number; count: number } | undefined,
): StoreProductSummary {
  const { availability, lowStock } = availabilityOf(row.inventory);
  const category = embedded(row.category);
  const parentName = category?.parent_id
    ? (categoryById.get(category.parent_id)?.name ?? null)
    : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    productCode: row.product_code,
    categorySlug: category?.slug ?? "",
    categoryName: category?.name ?? null,
    categoryParentName: parentName,
    skus: (row.product_variants ?? [])
      .filter((v) => v.is_active)
      .map((v) => v.sku),
    pricePaise: row.selling_price_paise,
    mrpPaise: row.mrp_paise,
    images: cardImages(row.product_media),
    colorLabel:
      typeof row.attributes.color === "string" ? row.attributes.color : null,
    materialLabel:
      (typeof row.attributes.material === "string" &&
        row.attributes.material) ||
      (typeof row.attributes.fabric === "string" ? row.attributes.fabric : null),
    availability,
    lowStock,
    isNew: isNew(row.published_at),
    publishedAt: row.published_at,
    attributes: row.attributes,
    collectionSlugs: (row.collection_products ?? [])
      .map((cp) => collectionSlugById.get(cp.collection_id))
      .filter((s): s is string => s !== undefined),
    rating: rating ?? null,
  };
}

/** All published products as public summaries (one request). */
export async function listPublishedProducts(): Promise<
  StoreProductSummary[]
> {
  const supabase = await createServerClient();

  const { data: collections, error: collErr } = await supabase
    .from("collections")
    .select("id, slug")
    .eq("is_active", true);
  if (collErr) throw new Error(`collections: ${collErr.message}`);
  const slugById = new Map(
    (collections ?? []).map((c) => [c.id, c.slug]),
  );

  const { data: rows, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, product_code, selling_price_paise, mrp_paise,
       attributes, published_at, created_at,
       category:categories(slug, name, parent_id),
       product_media(url, alt, position, is_primary),
       product_variants(sku, is_active),
       inventory(quantity, reserved_quantity, low_stock_threshold),
       collection_products(collection_id)`,
    )
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(LIST_LIMIT);
  if (error) throw new Error(`products: ${error.message}`);

  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name, parent_id");
  const categoryById = new Map(
    (allCategories ?? []).map((c) => [c.id, { name: c.name, parentId: c.parent_id }]),
  );

  const ratings = await ratingAggregates(
    supabase,
    (rows ?? []).map((r) => r.id),
  );

  return (rows ?? []).map((r) =>
    toSummary(r as RawProductRow, slugById, categoryById, ratings.get(r.id)),
  );
}

/** Active categories as a flat list (nav + category pages + facets). */
export async function listStorefrontCategories(): Promise<CategoryNode[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, position")
    .eq("is_active", true)
    .order("position");
  if (error) throw new Error(`categories: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    position: c.position,
  }));
}

export interface CollectionInfo extends RawCollectionRow {
  productCount: number;
}

/** Active collections with their published-product counts. */
export async function listStorefrontCollections(): Promise<
  CollectionInfo[]
> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug, description, position")
    .eq("is_active", true)
    .order("position");
  if (error) throw new Error(`collections: ${error.message}`);

  const { data: links, error: linkErr } = await supabase
    .from("collection_products")
    .select("collection_id, product_id, products!inner(status)");
  if (linkErr) throw new Error(`collection_products: ${linkErr.message}`);

  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    const products = Array.isArray(link.products)
      ? link.products[0]
      : link.products;
    if (products?.status === "PUBLISHED") {
      counts.set(
        link.collection_id,
        (counts.get(link.collection_id) ?? 0) + 1,
      );
    }
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    position: c.position,
    productCount: counts.get(c.id) ?? 0,
  }));
}

export interface StorefrontProductBundle {
  product: ProductRow;
  categoryName: string | null;
  categorySlug: string | null;
  parentCategoryName: string | null;
  media: ProductMediaRow[];
  variants: Array<{
    id: string;
    sku: string;
    name: string | null;
    pricePaise: number;
    mrpPaise: number | null;
    available: number;
  }>;
  collectionSlugs: string[];
  rating: { average: number; count: number } | null;
  reviews: Array<{
    id: string;
    customerName: string | null;
    rating: number;
    title: string | null;
    body: string | null;
    createdAt: string;
  }>;
}

/** One published product by slug for /product/[slug] (anon-visible only). */
export async function getPublishedProductBySlug(
  slug: string,
): Promise<StorefrontProductBundle | null> {
  const supabase = await createServerClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .single();
  if (error || !product) return null;

  const { data: category } = await supabase
    .from("categories")
    .select("slug, name, parent_id")
    .eq("id", product.category_id)
    .single();

  let parentCategoryName: string | null = null;
  if (category?.parent_id) {
    const { data: parent } = await supabase
      .from("categories")
      .select("name")
      .eq("id", category.parent_id)
      .single();
    parentCategoryName = parent?.name ?? null;
  }

  const { data: media } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", product.id)
    .order("position");
  const orderedMedia = [...(media ?? [])].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
  );

  const { data: variantRows } = await supabase
    .from("product_variants")
    .select(
      `id, sku, name, selling_price_paise, mrp_paise,
       inventory(quantity, reserved_quantity)`,
    )
    .eq("product_id", product.id)
    .eq("is_active", true)
    .order("created_at");

  const variants = (variantRows ?? []).map((v) => {
    const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      pricePaise: v.selling_price_paise ?? product.selling_price_paise,
      mrpPaise: v.mrp_paise ?? product.mrp_paise,
      available: Math.max(
        (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0),
        0,
      ),
    };
  });

  const { data: links } = await supabase
    .from("collection_products")
    .select("collection_id, collections!inner(slug, is_active)")
    .eq("product_id", product.id);
  const collectionSlugs = (links ?? [])
    .map((l) => {
      const c = Array.isArray(l.collections) ? l.collections[0] : l.collections;
      return c?.is_active ? (c.slug as string) : null;
    })
    .filter((s): s is string => s !== null);

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, title, body, created_at")
    .eq("product_id", product.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const reviews = (reviewRows ?? []).map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  }));

  const rating =
    reviews.length > 0
      ? {
          average:
            Math.round(
              (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
            ) / 10,
          count: reviews.length,
        }
      : null;

  return {
    product: product as unknown as ProductRow,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    parentCategoryName,
    media: orderedMedia as unknown as ProductMediaRow[],
    variants,
    collectionSlugs,
    rating,
    reviews,
  };
}
