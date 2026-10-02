import { describe, expect, it } from "vitest";

import {
  buildQuote,
  computeShippingPaise,
  type QuoteInventory,
  type QuoteProduct,
  type QuoteShippingSettings,
  type QuoteVariant,
} from "@/lib/checkout/quote";

const settings: QuoteShippingSettings = {
  defaultShippingPaise: 9000,
  freeShippingThresholdPaise: 200000,
};

const saree: QuoteProduct = {
  id: "p1",
  status: "PUBLISHED",
  name: "Wine Silk Saree",
  productCode: "SVS-P-00121",
  slug: "wine-silk-saree",
  sellingPricePaise: 599900,
  mrpPaise: 799900,
};

const kurti: QuoteProduct = {
  id: "p2",
  status: "PUBLISHED",
  name: "Pink Kurti",
  productCode: "SVS-P-00183",
  slug: "pink-kurti",
  sellingPricePaise: 179900,
  mrpPaise: 179900,
};

const sareeVariant: QuoteVariant = {
  id: "v1",
  productId: "p1",
  sku: "SVS-P-00121-DEFAULT",
  name: null,
  isActive: true,
  sellingPricePaise: null, // falls back to the product price
  mrpPaise: null,
};

const kurtiM: QuoteVariant = {
  id: "v2",
  productId: "p2",
  sku: "SVS-P-00183-M",
  name: "Size M",
  isActive: true,
  sellingPricePaise: null,
  mrpPaise: null,
};

const inventory: QuoteInventory[] = [
  { variantId: "v1", quantity: 3, reservedQuantity: 1 }, // 2 available
  { variantId: "v2", quantity: 5, reservedQuantity: 0 },
];

const products = [saree, kurti];
const variants = [sareeVariant, kurtiM];

describe("buildQuote — §18 multi-product totals", () => {
  it("sums lines, computes MRP savings and adds shipping below the free threshold", () => {
    // saree ×1 @5999 (MRP 7999) + kurti ×2 @1799 = ₹9597 — below ₹10000
    const quote = buildQuote(
      [
        { variantId: "v1", quantity: 1 },
        { variantId: "v2", quantity: 2 },
      ],
      products,
      variants,
      inventory,
      { defaultShippingPaise: 9000, freeShippingThresholdPaise: 1000000 },
    );

    expect(quote.ok).toBe(true);
    expect(quote.lines).toHaveLength(2);
    expect(quote.totals.subtotalPaise).toBe(599900 + 179900 * 2);
    expect(quote.totals.discountPaise).toBe((799900 - 599900) * 1); // kurti has no MRP gap
    expect(quote.totals.shippingPaise).toBe(9000);
    expect(quote.totals.totalPaise).toBe(599900 + 179900 * 2 + 9000);
  });

  it("ships free once the subtotal reaches the threshold (boundary is inclusive)", () => {
    const quote = buildQuote(
      [{ variantId: "v1", quantity: 1 }],
      products,
      variants,
      inventory,
      { defaultShippingPaise: 9000, freeShippingThresholdPaise: 599900 },
    );
    expect(quote.totals.shippingPaise).toBe(0);
    expect(quote.totals.totalPaise).toBe(599900);
  });

  it("uses the variant price when the variant carries one", () => {
    const quote = buildQuote(
      [{ variantId: "v2", quantity: 1 }],
      products,
      [{ ...kurtiM, sellingPricePaise: 199900, mrpPaise: 249900 }],
      inventory,
      { defaultShippingPaise: 0, freeShippingThresholdPaise: null },
    );
    expect(quote.lines[0].unitPricePaise).toBe(199900);
    expect(quote.totals.discountPaise).toBe(50000);
  });

  it("coalesces duplicate variant requests instead of stacking them", () => {
    const quote = buildQuote(
      [
        { variantId: "v1", quantity: 1 },
        { variantId: "v1", quantity: 2 },
      ],
      products,
      variants,
      inventory,
      settings,
    );
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0].quantity).toBe(1);
  });
});

describe("buildQuote — §22 verification failures", () => {
  it("clamps over-stock quantity and reports an issue (never sells beyond stock)", () => {
    const quote = buildQuote(
      [{ variantId: "v1", quantity: 5 }],
      products,
      variants,
      inventory,
      settings,
    );
    expect(quote.lines[0].quantity).toBe(2);
    expect(quote.ok).toBe(false);
    expect(quote.issues[0].code).toBe("INSUFFICIENT_STOCK");
    expect(quote.issues[0].available).toBe(2);
    // The clamped line still prices at the real quantity.
    expect(quote.totals.subtotalPaise).toBe(599900 * 2);
  });

  it("drops a sold-out line entirely and reports it", () => {
    const quote = buildQuote(
      [{ variantId: "v2", quantity: 1 }],
      products,
      variants,
      [{ variantId: "v2", quantity: 0, reservedQuantity: 0 }],
      settings,
    );
    expect(quote.lines).toHaveLength(0);
    expect(quote.ok).toBe(false);
    expect(quote.issues[0].code).toBe("INSUFFICIENT_STOCK");
  });

  it("flags an unpublished product as unavailable", () => {
    const quote = buildQuote(
      [{ variantId: "v1", quantity: 1 }],
      [{ ...saree, status: "DRAFT" }],
      variants,
      inventory,
      settings,
    );
    expect(quote.lines).toHaveLength(0);
    expect(quote.issues[0].code).toBe("PRODUCT_UNAVAILABLE");
  });

  it("flags a deactivated variant as unavailable", () => {
    const quote = buildQuote(
      [{ variantId: "v2", quantity: 1 }],
      products,
      [{ ...kurtiM, isActive: false }],
      inventory,
      settings,
    );
    expect(quote.issues[0].code).toBe("PRODUCT_UNAVAILABLE");
  });

  it("flags an unknown variant id and an invalid quantity", () => {
    const quote = buildQuote(
      [
        { variantId: "missing", quantity: 1 },
        { variantId: "v1", quantity: 0 },
      ],
      products,
      variants,
      inventory,
      settings,
    );
    expect(quote.issues.map((i) => i.code)).toEqual([
      "VARIANT_UNAVAILABLE",
      "INVALID_QUANTITY",
    ]);
    expect(quote.lines).toHaveLength(0);
    expect(quote.ok).toBe(false);
  });

  it("an empty request is never ok", () => {
    const quote = buildQuote([], products, variants, inventory, settings);
    expect(quote.ok).toBe(false);
    expect(quote.totals.totalPaise).toBe(0);
  });
});

describe("computeShippingPaise", () => {
  it("returns the flat default when no threshold is configured", () => {
    expect(
      computeShippingPaise(500000, {
        defaultShippingPaise: 9000,
        freeShippingThresholdPaise: null,
      }),
    ).toBe(9000);
  });

  it("charges below the threshold, frees at and above it", () => {
    const s = { defaultShippingPaise: 9000, freeShippingThresholdPaise: 200000 };
    expect(computeShippingPaise(199999, s)).toBe(9000);
    expect(computeShippingPaise(200000, s)).toBe(0);
  });
});
