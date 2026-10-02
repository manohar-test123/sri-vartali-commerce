/**
 * Cart reads (spec §18, §22). Server-only, admin client — `carts` and
 * `cart_items` carry no RLS policies by design, so every access rides the
 * service-role client and stays inside server code.
 *
 * Nothing priced here is trusted later: these reads produce the display /
 * estimate layer; the checkout quote re-fetches fresh rows and runs the
 * same pure `buildQuote` engine the order creator will use in Phase 6.
 */

import { createAdminClient } from "@/lib/db/admin";

import type { Quote, QuoteRequestLine } from "@/lib/checkout/quote";
import {
  buildQuote,
  type QuoteInventory,
  type QuoteProduct,
  type QuoteShippingSettings,
  type QuoteVariant,
} from "@/lib/checkout/quote";
import { readBuyNow, readCartToken } from "@/lib/cart/cookies";

/** Display-only extras the quote lines don't carry (image for the cart UI). */
export interface CartLineMeta {
  variantId: string;
  imageUrl: string | null;
  imageAlt: string | null;
  available: number;
}

export interface CartView {
  quote: Quote;
  meta: CartLineMeta[];
}

const EMPTY_VIEW: CartView = {
  quote: {
    lines: [],
    totals: {
      subtotalPaise: 0,
      discountPaise: 0,
      shippingPaise: 0,
      totalPaise: 0,
    },
    issues: [],
    ok: false,
  },
  meta: [],
};

async function fetchShippingSettings(): Promise<QuoteShippingSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("store_settings")
    .select("default_shipping_paise, free_shipping_threshold_paise")
    .eq("id", 1)
    .maybeSingle();
  return {
    defaultShippingPaise: data?.default_shipping_paise ?? 0,
    freeShippingThresholdPaise: data?.free_shipping_threshold_paise ?? null,
  };
}

/**
 * Resolve requested lines against fresh catalog state: quote + UI metadata.
 * This is the single read path behind /cart, /checkout and the review
 * action — no caller fetches prices for itself.
 */
export async function quoteLines(requested: QuoteRequestLine[]): Promise<CartView> {
  if (requested.length === 0) return EMPTY_VIEW;

  const admin = createAdminClient();
  const variantIds = [...new Set(requested.map((l) => l.variantId))];

  const { data: variantRows, error: variantError } = await admin
    .from("product_variants")
    .select(
      `id, product_id, sku, name, selling_price_paise, mrp_paise, is_active,
       products!inner(id, slug, name, product_code, status, selling_price_paise, mrp_paise)`,
    )
    .in("id", variantIds);
  if (variantError) throw new Error(`product_variants: ${variantError.message}`);

  const productIds = [
    ...new Set(
      ((variantRows ?? []) as Array<{ products?: { id?: string } | Array<{ id?: string }> }>)
        .map((v) => (Array.isArray(v.products) ? v.products[0]?.id : v.products?.id))
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const [{ data: inventoryRows, error: inventoryError }, { data: mediaRows }] =
    await Promise.all([
      admin
        .from("inventory")
        .select("variant_id, quantity, reserved_quantity")
        .in("variant_id", variantIds),
      productIds.length > 0
        ? admin
            .from("product_media")
            .select("product_id, url, alt, position, is_primary")
            .in("product_id", productIds)
        : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    ]);
  if (inventoryError) throw new Error(`inventory: ${inventoryError.message}`);

  // products!inner embeds as one object per variant row.
  const products: QuoteProduct[] = [];
  const variants: QuoteVariant[] = [];
  for (const row of variantRows ?? []) {
    const p = row.products as unknown as {
      id: string;
      slug: string;
      name: string;
      product_code: string;
      status: string;
      selling_price_paise: number;
      mrp_paise: number | null;
    } | null;
    if (!p) continue;
    if (!products.some((existing) => existing.id === p.id)) {
      products.push({
        id: p.id,
        status: p.status,
        name: p.name,
        productCode: p.product_code,
        slug: p.slug,
        sellingPricePaise: p.selling_price_paise,
        mrpPaise: p.mrp_paise,
      });
    }
    variants.push({
      id: row.id,
      productId: row.product_id,
      sku: row.sku,
      name: row.name,
      isActive: row.is_active,
      sellingPricePaise: row.selling_price_paise,
      mrpPaise: row.mrp_paise,
    });
  }

  const inventory: QuoteInventory[] = (inventoryRows ?? []).map((i) => ({
    variantId: i.variant_id,
    quantity: i.quantity,
    reservedQuantity: i.reserved_quantity,
  }));

  const settings = await fetchShippingSettings();
  const quote = buildQuote(requested, products, variants, inventory, settings);

  // Primary (else first) image per product + per-variant availability.
  const imageByProduct = new Map<string, { url: string; alt: string | null }>();
  for (const m of (mediaRows ?? []) as Array<{
    product_id: string;
    url: string;
    alt: string | null;
    position: number;
    is_primary: boolean;
  }>) {
    const current = imageByProduct.get(m.product_id);
    const beats = current === undefined || m.is_primary;
    if (beats) imageByProduct.set(m.product_id, { url: m.url, alt: m.alt });
  }
  const availableByVariant = new Map(
    inventory.map((i) => [i.variantId, Math.max(i.quantity - i.reservedQuantity, 0)]),
  );

  const meta: CartLineMeta[] = quote.lines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    const image = product ? imageByProduct.get(product.id) : undefined;
    return {
      variantId: line.variantId,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? line.productName,
      available: availableByVariant.get(line.variantId) ?? 0,
    };
  });

  return { quote, meta };
}

async function cartItemLines(): Promise<QuoteRequestLine[]> {
  const token = await readCartToken();
  if (!token) return [];

  const admin = createAdminClient();
  const { data: cart } = await admin
    .from("carts")
    .select("id")
    .eq("cart_token", token)
    .maybeSingle();
  if (!cart) return [];

  const { data: items, error } = await admin
    .from("cart_items")
    .select("variant_id, quantity")
    .eq("cart_id", cart.id)
    .order("created_at");
  if (error) throw new Error(`cart_items: ${error.message}`);

  return ((items ?? []) as Array<{ variant_id: string; quantity: number }>).map(
    (i) => ({
      variantId: i.variant_id,
      quantity: i.quantity,
    }),
  );
}

/** Total units in the DB cart for the header badge (0 when no cart yet). */
export async function getCartCount(): Promise<number> {
  const lines = await cartItemLines();
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/** /cart view: the DB cart, quoted. */
export async function getCartView(): Promise<CartView> {
  return quoteLines(await cartItemLines());
}

/**
 * /checkout view (§19): the buy-now temporary cart wins while it exists;
 * otherwise the DB cart. The mode rides along so the UI can say which.
 */
export async function getCheckoutView(): Promise<
  CartView & { mode: "buy-now" | "cart" }
> {
  const buyNow = await readBuyNow();
  if (buyNow) {
    return { ...(await quoteLines([buyNow])), mode: "buy-now" };
  }
  return { ...(await getCartView()), mode: "cart" };
}
