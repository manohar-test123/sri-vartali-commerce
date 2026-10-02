/**
 * Server-side quote engine — spec §22 steps 1–9 of order creation, minus
 * the order itself (Phase 6): re-fetch, re-verify, recalculate.
 *
 * Prices and stock NEVER come from the browser. The caller (server action /
 * server component) fetches fresh rows and passes them here; this module is
 * the single pure place where totals are computed, so the cart estimate,
 * the checkout review and (in Phase 6) the persisted order all agree.
 *
 * Money semantics (paise integers, rule 7):
 *   subtotal = Σ selling_price × qty          — the payable goods amount
 *   discount = Σ max(mrp − selling, 0) × qty  — savings vs MRP, informational
 *   shipping = 0 when free_shipping_threshold_paise is set and subtotal
 *              reaches it, else default_shipping_paise
 *   total    = subtotal + shipping
 */

export interface QuoteProduct {
  id: string;
  status: string;
  name: string;
  productCode: string;
  slug: string;
  sellingPricePaise: number;
  mrpPaise: number | null;
}

export interface QuoteVariant {
  id: string;
  productId: string;
  sku: string;
  name: string | null;
  isActive: boolean;
  sellingPricePaise: number | null;
  mrpPaise: number | null;
}

export interface QuoteInventory {
  variantId: string;
  quantity: number;
  reservedQuantity: number;
}

export interface QuoteShippingSettings {
  defaultShippingPaise: number;
  freeShippingThresholdPaise: number | null;
}

/** One requested line — ids and quantity only, never prices. */
export interface QuoteRequestLine {
  variantId: string;
  quantity: number;
}

export type QuoteIssueCode =
  | "PRODUCT_UNAVAILABLE"
  | "VARIANT_UNAVAILABLE"
  | "INVALID_QUANTITY"
  | "INSUFFICIENT_STOCK";

export interface QuoteIssue {
  variantId: string;
  code: QuoteIssueCode;
  message: string;
  /** Present for INSUFFICIENT_STOCK — what the customer can actually buy. */
  available?: number;
}

export interface QuoteLine {
  variantId: string;
  productId: string;
  productName: string;
  productCode: string;
  productSlug: string;
  variantName: string | null;
  sku: string;
  unitPricePaise: number;
  unitMrpPaise: number | null;
  quantity: number;
  lineTotalPaise: number;
}

export interface QuoteTotals {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
}

export interface Quote {
  lines: QuoteLine[];
  totals: QuoteTotals;
  issues: QuoteIssue[];
  /** True when every line verified — the checkout gate. */
  ok: boolean;
}

export const EMPTY_QUOTE_TOTALS: QuoteTotals = {
  subtotalPaise: 0,
  discountPaise: 0,
  shippingPaise: 0,
  totalPaise: 0,
};

export function computeShippingPaise(
  subtotalPaise: number,
  settings: QuoteShippingSettings,
): number {
  if (
    settings.freeShippingThresholdPaise !== null &&
    subtotalPaise >= settings.freeShippingThresholdPaise
  ) {
    return 0;
  }
  return settings.defaultShippingPaise;
}

/**
 * Verify requested lines against fresh catalog state and compute totals.
 * Unavailable lines are dropped from pricing but reported in `issues`;
 * an over-quantity line is clamped to stock and reported, never silently
 * sold beyond availability.
 */
export function buildQuote(
  requested: QuoteRequestLine[],
  products: QuoteProduct[],
  variants: QuoteVariant[],
  inventory: QuoteInventory[],
  settings: QuoteShippingSettings,
): Quote {
  const issues: QuoteIssue[] = [];
  const lines: QuoteLine[] = [];

  const productById = new Map(products.map((p) => [p.id, p]));
  const variantById = new Map(variants.map((v) => [v.id, v]));
  const inventoryByVariant = new Map(inventory.map((i) => [i.variantId, i]));

  const seen = new Set<string>();
  for (const request of requested) {
    if (!Number.isInteger(request.quantity) || request.quantity < 1) {
      issues.push({
        variantId: request.variantId,
        code: "INVALID_QUANTITY",
        message: "Quantity must be at least 1.",
      });
      continue;
    }

    // Coalesce duplicate variant requests (cart + buy-now must not stack).
    if (seen.has(request.variantId)) continue;
    seen.add(request.variantId);

    const variant = variantById.get(request.variantId);
    const product = variant ? productById.get(variant.productId) : undefined;
    if (!variant || !product || product.status !== "PUBLISHED" || !variant.isActive) {
      issues.push({
        variantId: request.variantId,
        code: variant ? "PRODUCT_UNAVAILABLE" : "VARIANT_UNAVAILABLE",
        message: "This item is no longer available and was removed.",
      });
      continue;
    }

    const inv = inventoryByVariant.get(variant.id);
    const available =
      inv === undefined ? 0 : Math.max(inv.quantity - inv.reservedQuantity, 0);
    const quantity = Math.min(request.quantity, available);
    if (quantity < 1) {
      issues.push({
        variantId: variant.id,
        code: "INSUFFICIENT_STOCK",
        message: "This item just sold out.",
        available: 0,
      });
      continue;
    }
    if (quantity < request.quantity) {
      issues.push({
        variantId: variant.id,
        code: "INSUFFICIENT_STOCK",
        message: `Only ${quantity} left in stock — quantity was adjusted.`,
        available: quantity,
      });
    }

    const unitPricePaise = variant.sellingPricePaise ?? product.sellingPricePaise;
    const unitMrpPaise = variant.mrpPaise ?? product.mrpPaise;
    lines.push({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      productCode: product.productCode,
      productSlug: product.slug,
      variantName: variant.name,
      sku: variant.sku,
      unitPricePaise,
      unitMrpPaise,
      quantity,
      lineTotalPaise: unitPricePaise * quantity,
    });
  }

  const subtotalPaise = lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);
  const discountPaise = lines.reduce(
    (sum, l) =>
      sum +
      (l.unitMrpPaise !== null && l.unitMrpPaise > l.unitPricePaise
        ? (l.unitMrpPaise - l.unitPricePaise) * l.quantity
        : 0),
    0,
  );
  const shippingPaise =
    lines.length === 0 ? 0 : computeShippingPaise(subtotalPaise, settings);

  return {
    lines,
    totals: {
      subtotalPaise,
      discountPaise,
      shippingPaise,
      totalPaise: subtotalPaise + shippingPaise,
    },
    issues,
    ok: issues.length === 0 && lines.length > 0,
  };
}
