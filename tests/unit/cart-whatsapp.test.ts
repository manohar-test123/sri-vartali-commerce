import { describe, expect, it } from "vitest";

import { buildCartWhatsAppMessage } from "@/lib/cart/whatsapp";
import type { Quote } from "@/lib/checkout/quote";

function quoteFixture(overrides?: Partial<Quote>): Quote {
  return {
    lines: [
      {
        variantId: "v-1",
        productId: "p-1",
        productName: "Wine Kanchipuram Silk Saree",
        productCode: "SVS-P-00121",
        productSlug: "wine-kanchipuram-silk-saree",
        variantName: "Wine · M",
        sku: "SVS-V-00241",
        unitPricePaise: 599900,
        unitMrpPaise: 799900,
        quantity: 1,
        lineTotalPaise: 599900,
      },
      {
        variantId: "v-2",
        productId: "p-2",
        productName: "Cotton Daily Saree",
        productCode: "SVS-P-00183",
        productSlug: "cotton-daily-saree",
        variantName: null,
        sku: "SVS-V-00242",
        unitPricePaise: 179900,
        unitMrpPaise: null,
        quantity: 2,
        lineTotalPaise: 359800,
      },
    ],
    totals: {
      subtotalPaise: 959700,
      discountPaise: 200000,
      shippingPaise: 0,
      totalPaise: 959700,
    },
    issues: [],
    ok: true,
    ...overrides,
  };
}

describe("buildCartWhatsAppMessage", () => {
  it("renders every line with id, variant, qty and price", () => {
    const message = buildCartWhatsAppMessage(quoteFixture());

    expect(message).toContain("Hello Sri Vartali Sarees 👋");
    expect(message).toContain("1. Wine Kanchipuram Silk Saree");
    expect(message).toContain("Product ID: SVS-P-00121");
    expect(message).toContain("Variant: Wine · M");
    expect(message).toContain("Qty: 1");
    expect(message).toContain("Price: ₹5,999");
    expect(message).toContain("2. Cotton Daily Saree");
    expect(message).toContain("Qty: 2");
    expect(message).toContain("Price: ₹3,598");
  });

  it("omits the variant line when the product has no variants", () => {
    const message = buildCartWhatsAppMessage(quoteFixture());
    const cottonBlock = message.split("2. Cotton Daily Saree")[1]?.split("3.")?.[0] ?? "";
    expect(cottonBlock).not.toContain("Variant:");
  });

  it("renders the totals block with discount and free shipping", () => {
    const message = buildCartWhatsAppMessage(quoteFixture());

    expect(message).toContain("ORDER SUMMARY (from website):");
    expect(message).toContain("Subtotal: ₹9,597");
    expect(message).toContain("Discount: -₹2,000");
    expect(message).toContain("Shipping: Free");
    expect(message).toContain("Estimated total: ₹9,597");
    expect(message).toContain(
      "Please confirm availability and share payment details. Thank you!",
    );
  });

  it("shows a rupee amount instead of Free when shipping is charged", () => {
    const message = buildCartWhatsAppMessage(
      quoteFixture({
        totals: {
          subtotalPaise: 959700,
          discountPaise: 0,
          shippingPaise: 15000,
          totalPaise: 974700,
        },
      }),
    );

    expect(message).toContain("Shipping: ₹150");
    expect(message).not.toContain("Discount:");
    expect(message).toContain("Estimated total: ₹9,747");
  });

  it("never carries browser-supplied prices — only the quoted totals", () => {
    const message = buildCartWhatsAppMessage(quoteFixture());
    // Encoding target for the wa.me deep link is tested in order-whatsapp;
    // here we only pin the money surfaces the message exposes.
    expect(message.match(/₹/g)?.length).toBe(5);
  });
});
