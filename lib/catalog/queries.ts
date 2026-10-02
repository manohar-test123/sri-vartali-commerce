/**
 * Catalog reads for the client CMS (spec §14-§17).
 *
 * Server-only: every query rides the caller's session so RLS limits the
 * client role to what the policies allow (rule 21).
 */

import { createClient as createServerClient } from "@/lib/db/server";
import { parseSchema } from "@/lib/catalog/attributes";
import type {
  AttributeValues,
  ProductMediaRow,
  ProductRow,
  ProductStatus,
} from "@/lib/catalog/types";

export interface CategoryPickerItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  attributeSchemaJson: unknown;
}

export interface VariantWithStock {
  id: string;
  sku: string;
  name: string | null;
  sellingPricePaise: number | null;
  isActive: boolean;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
}

export interface ProductBundle {
  product: ProductRow;
  /** Flattened attribute schema actually driving this product's editor. */
  attributeSchemaJson: unknown;
  media: ProductMediaRow[];
  variants: VariantWithStock[];
}

export interface ProductListItem {
  id: string;
  name: string;
  productCode: string;
  status: ProductStatus;
  sellingPricePaise: number;
  stock: number;
  imageUrl: string | null;
  updatedAt: string;
}

export async function listCategories(): Promise<CategoryPickerItem[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, name, slug, parent_id, position, attribute_schema, is_active",
    )
    .eq("is_active", true)
    .order("position");

  if (error) throw new Error(`categories: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    position: c.position,
    attributeSchemaJson: c.attribute_schema,
  }));
}

export async function listProducts(
  search: string | undefined,
): Promise<ProductListItem[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from("products")
    .select(
      `id, name, product_code, status, selling_price_paise, updated_at,
       inventory(quantity),
       media:product_media(url, position, is_primary)`,
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (search && search.trim() !== "") {
    const like = `%${search.trim()}%`;
    query = query.or(`name.ilike.${like},product_code.ilike.${like}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`products: ${error.message}`);

  return (data ?? []).map((p) => {
    const media = (p.media ?? []) as Array<{
      url: string;
      position: number;
      is_primary: boolean;
    }>;
    const primary =
      media.find((m) => m.is_primary) ??
      [...media].sort((a, b) => a.position - b.position)[0];
    const stock = ((p.inventory ?? []) as Array<{ quantity: number }>).reduce(
      (sum, i) => sum + (i.quantity ?? 0),
      0,
    );
    return {
      id: p.id,
      name: p.name,
      productCode: p.product_code,
      status: p.status as ProductStatus,
      sellingPricePaise: p.selling_price_paise,
      stock,
      imageUrl: primary?.url ?? null,
      updatedAt: p.updated_at,
    };
  });
}

export async function getProductBundle(
  productId: string,
): Promise<ProductBundle | null> {
  const supabase = await createServerClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (error || !product) return null;

  // Effective schema: the product's own category, or its parent when the
  // leaf category declares no fields (§4 — parents carry the seeds).
  let attributeSchemaJson: unknown = [];
  const { data: category } = await supabase
    .from("categories")
    .select("id, parent_id, attribute_schema")
    .eq("id", product.category_id)
    .single();

  let schemaSource: unknown = [];
  if (category) {
    const own = parseSchema(category.attribute_schema);
    if (own.length > 0) {
      schemaSource = own;
    } else if (category.parent_id) {
      const { data: parent } = await supabase
        .from("categories")
        .select("attribute_schema")
        .eq("id", category.parent_id)
        .single();
      schemaSource = parent?.attribute_schema ?? [];
    }
  }
  attributeSchemaJson = schemaSource;

  const { data: mediaRows } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", productId)
    .order("position");

  const { data: variantRows } = await supabase
    .from("product_variants")
    .select(
      `id, sku, name, selling_price_paise, is_active,
       inventory(quantity, reserved_quantity, low_stock_threshold)`,
    )
    .eq("product_id", productId)
    .order("created_at");

  const variants: VariantWithStock[] = (variantRows ?? []).map((v) => {
    const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      sellingPricePaise: v.selling_price_paise,
      isActive: v.is_active,
      quantity: inv?.quantity ?? 0,
      reservedQuantity: inv?.reserved_quantity ?? 0,
      lowStockThreshold: inv?.low_stock_threshold ?? 2,
    };
  });

  return {
    product: product as unknown as ProductRow,
    attributeSchemaJson,
    media: (mediaRows ?? []) as unknown as ProductMediaRow[],
    variants,
  };
}

/** Attribute values as the editor expects them (typed passthrough). */
export function readAttributeValues(
  bundle: ProductBundle,
): AttributeValues {
  return (bundle.product.attributes ?? {}) as AttributeValues;
}
