/**
 * Dashboard reads for the §8 management pages (categories, collections,
 * inventory, customers, shipping).
 *
 * Server-only: every query rides the caller's session so RLS limits the
 * client role to what the policies allow (rule 21) — same contract as
 * lib/catalog/queries.ts.
 */

import { createClient as createServerClient } from "@/lib/db/server";

/* ── categories ───────────────────────────────────────────────────────── */

export interface CategoryListRow {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  position: number;
  isActive: boolean;
  attributeSchemaText: string;
  productCount: number;
}

export async function listCategoriesWithCounts(): Promise<CategoryListRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      `id, name, slug, parent_id, description, position, is_active,
       attribute_schema,
       parent:categories!categories_parent_id_fkey(name),
       products(count)`,
    )
    .order("position")
    .order("name");

  if (error) throw new Error(`categories: ${error.message}`);
  return (data ?? []).map((c) => {
    const parent = Array.isArray(c.parent) ? c.parent[0] : c.parent;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parent_id,
      parentName: parent?.name ?? null,
      description: c.description,
      position: c.position,
      isActive: c.is_active,
      attributeSchemaText: JSON.stringify(c.attribute_schema ?? [], null, 2),
      productCount: c.products?.[0]?.count ?? 0,
    };
  });
}

/* ── collections ──────────────────────────────────────────────────────── */

export interface CollectionProductRow {
  productId: string;
  name: string;
  productCode: string;
  status: string;
}

export interface CollectionListRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  products: CollectionProductRow[];
}

export async function listCollectionsWithProducts(): Promise<CollectionListRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("collections")
    .select(
      `id, name, slug, description, position, is_active,
       collection_products(
         added_at,
         products(id, name, product_code, status)
       )`,
    )
    .order("position")
    .order("name");

  if (error) throw new Error(`collections: ${error.message}`);

  return (data ?? []).map((c) => {
    const joins = (c.collection_products ?? []) as Array<{
      added_at: string;
      products: { id: string; name: string; product_code: string; status: string } | Array<{
        id: string;
        name: string;
        product_code: string;
        status: string;
      }> | null;
    }>;
    // PostgREST may nest embedded rows in an array depending on the relation
    // shape — normalize both forms.
    const products = joins
      .map((j) => (Array.isArray(j.products) ? j.products[0] : j.products))
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        productCode: p.product_code,
        status: p.status,
      }));
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      position: c.position,
      isActive: c.is_active,
      productCount: products.length,
      products,
    };
  });
}

/** Published + draft products, for the collection membership pickers. */
export interface ProductPickerItem {
  id: string;
  name: string;
  productCode: string;
  status: string;
}

export async function listProductsForPickers(): Promise<ProductPickerItem[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, product_code, status")
    .neq("status", "ARCHIVED")
    .order("name")
    .limit(500);
  if (error) throw new Error(`products: ${error.message}`);
  return (data ?? []).map(
    (p): ProductPickerItem => ({
      id: p.id,
      name: p.name,
      productCode: p.product_code,
      status: p.status,
    }),
  );
}

/* ── inventory ────────────────────────────────────────────────────────── */

export interface InventoryRow {
  inventoryId: string;
  productId: string;
  productName: string;
  productCode: string;
  productStatus: string;
  variantId: string;
  variantName: string | null;
  sku: string;
  isActive: boolean;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
}

export async function listInventory(
  search: string | undefined,
  lowOnly: boolean,
): Promise<InventoryRow[]> {
  const supabase = await createServerClient();
  const query = supabase
    .from("inventory")
    .select(
      `id, quantity, reserved_quantity, low_stock_threshold,
       products(id, name, product_code, status),
       product_variants(id, name, sku, is_active)`,
    )
    .limit(500);

  // Filters land in-memory after mapping — the launch catalog is small and
  // the joined-name search PostgREST cannot express cleanly (same trade-off
  // as lib/storefront/search.ts).
  const { data, error } = await query;
  if (error) throw new Error(`inventory: ${error.message}`);

  const rows: InventoryRow[] = (data ?? [])
    .map((r) => {
      const product = Array.isArray(r.products) ? r.products[0] : r.products;
      const variant = Array.isArray(r.product_variants)
        ? r.product_variants[0]
        : r.product_variants;
      if (!product || !variant) return null;
      return {
        inventoryId: r.id,
        productId: product.id,
        productName: product.name,
        productCode: product.product_code,
        productStatus: product.status,
        variantId: variant.id,
        variantName: variant.name,
        sku: variant.sku,
        isActive: variant.is_active,
        quantity: r.quantity,
        reservedQuantity: r.reserved_quantity,
        lowStockThreshold: r.low_stock_threshold,
      } satisfies InventoryRow;
    })
    .filter((r): r is InventoryRow => r !== null)
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const term = search?.trim().toLowerCase();
  let result = rows;
  if (term) {
    result = result.filter(
      (r) =>
        r.productName.toLowerCase().includes(term) ||
        r.productCode.toLowerCase().includes(term) ||
        r.sku.toLowerCase().includes(term) ||
        (r.variantName ?? "").toLowerCase().includes(term),
    );
  }
  if (lowOnly) {
    result = result.filter(
      (r) => r.quantity - r.reservedQuantity <= r.lowStockThreshold,
    );
  }
  return result;
}

/* ── customers ────────────────────────────────────────────────────────── */

export interface CustomerListRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  hasAccount: boolean;
  orderCount: number;
  lifetimePaise: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export async function listCustomers(
  search: string | undefined,
): Promise<CustomerListRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      `id, name, phone, email, user_id, created_at,
       orders(id, total_paise, order_status, created_at)`,
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(`customers: ${error.message}`);

  const rows = (data ?? []).map((c) => {
    const orders = (c.orders ?? []) as Array<{
      id: string;
      total_paise: number;
      order_status: string;
      created_at: string;
    }>;
    const active = orders.filter((o) => o.order_status !== "CANCELLED");
    const lastOrderAt = orders
      .map((o) => o.created_at)
      .sort()
      .at(-1);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      hasAccount: c.user_id !== null,
      orderCount: orders.length,
      lifetimePaise: active.reduce((sum, o) => sum + o.total_paise, 0),
      lastOrderAt: lastOrderAt ?? null,
      createdAt: c.created_at,
    } satisfies CustomerListRow;
  });

  const term = search?.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(term) ||
      r.phone.includes(term.replace(/\s/g, "")) ||
      (r.email ?? "").toLowerCase().includes(term),
  );
}

/* ── shipping ─────────────────────────────────────────────────────────── */

export interface ShipmentListRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  courier: string;
  trackingId: string;
  trackingUrl: string | null;
  status: string;
  shippedAt: string;
  deliveredAt: string | null;
}

export async function listShipments(): Promise<ShipmentListRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("shipments")
    .select(
      `id, courier, tracking_id, tracking_url, status, shipped_at, delivered_at,
       orders(id, order_number, customer_name, phone)`,
    )
    .order("shipped_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`shipments: ${error.message}`);

  return (data ?? [])
    .map((s) => {
      const order = Array.isArray(s.orders) ? s.orders[0] : s.orders;
      if (!order) return null;
      return {
        id: s.id,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        phone: order.phone,
        courier: s.courier,
        trackingId: s.tracking_id,
        trackingUrl: s.tracking_url,
        status: s.status,
        shippedAt: s.shipped_at,
        deliveredAt: s.delivered_at,
      } satisfies ShipmentListRow;
    })
    .filter((r): r is ShipmentListRow => r !== null);
}
