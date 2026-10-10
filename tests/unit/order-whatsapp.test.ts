import { describe, expect, it } from "vitest";

import {
  buildOrderWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/lib/orders/whatsapp";
import { normalizeRecipient } from "@/lib/whatsapp/send";
import type { AddressInput } from "@/lib/checkout/address";

const address: AddressInput = {
  pinCode: "600042",
  house: "Flat 302",
  street: "Anna Salai",
  area: "Teynampet",
  landmark: "Near the temple",
  district: "Chennai",
  state: "Tamil Nadu",
  locality: "Teynampet",
  country: "India",
};

const baseInput = {
  orderNumber: "SVS-ORD-20261002-00129",
  totalPaise: 1109600,
  customerName: "Anjali Reddy",
  phone: "9876543210",
  address,
  orderUrl: "https://svs.example/order/SVS-ORD-20261002-00129",
};

describe("buildOrderWhatsAppMessage (§27)", () => {
  it("renders the full message for a multi-product order", () => {
    const message = buildOrderWhatsAppMessage({
      ...baseInput,
      lines: [
        {
          productName: "Wine Kanchipuram Silk Saree",
          productCode: "SVS-P-00121",
          variantName: "Wine · M",
          quantity: 1,
          lineTotalPaise: 599900,
        },
        {
          productName: "Pink Kurti",
          productCode: "SVS-P-00183",
          variantName: null,
          quantity: 2,
          lineTotalPaise: 359800,
        },
      ],
    });

    expect(message).toContain("Hello Sri Vartali Sarees 👋");
    expect(message).toContain("Order ID:\nSVS-ORD-20261002-00129");
    expect(message).toContain("1. Wine Kanchipuram Silk Saree");
    expect(message).toContain("Product ID: SVS-P-00121");
    expect(message).toContain("Variant: Wine · M");
    expect(message).toContain("Qty: 1");
    expect(message).toContain("Price: ₹5,999");
    expect(message).toContain("2. Pink Kurti");
    expect(message).toContain("Qty: 2");
    expect(message).toContain("Price: ₹3,598");
    expect(message).toContain("TOTAL:\n₹11,096");
    expect(message).toContain("CUSTOMER:\nAnjali Reddy\n9876543210");
    expect(message).toContain("Flat 302,\nAnna Salai,\nTeynampet,");
    expect(message).toContain("Landmark: Near the temple,");
    expect(message).toContain("Chennai,\nTamil Nadu - 600042");
    expect(message).toContain(
      "Order Link:\nhttps://svs.example/order/SVS-ORD-20261002-00129",
    );
  });

  it("omits variant and landmark lines when absent", () => {
    const message = buildOrderWhatsAppMessage({
      ...baseInput,
      address: { ...address, landmark: null },
      lines: [
        {
          productName: "Gold Blouse",
          productCode: "SVS-P-00204",
          variantName: null,
          quantity: 1,
          lineTotalPaise: 149900,
        },
      ],
    });
    expect(message).not.toContain("Variant:");
    expect(message).not.toContain("Landmark:");
  });

  it("formats paise-exact totals, never floats", () => {
    const message = buildOrderWhatsAppMessage({
      ...baseInput,
      totalPaise: 1109650,
      lines: [
        {
          productName: "X",
          productCode: "SVS-P-000001",
          variantName: null,
          quantity: 1,
          lineTotalPaise: 1109650,
        },
      ],
    });
    expect(message).toContain("₹11,096.50");
  });
});

describe("buildWhatsAppUrl", () => {
  it("builds a wa.me link with the encoded message", () => {
    const url = buildWhatsAppUrl("919876543210", "Hello there");
    expect(url).toBe("https://wa.me/919876543210?text=Hello%20there");
  });

  it.each([
    ["+91 98765 43210", "919876543210"],
    ["09876543210", "919876543210"],
    ["9876543210", "919876543210"],
  ])("normalizes %s to %s", (input, digits) => {
    expect(buildWhatsAppUrl(input, "x")).toBe(
      `https://wa.me/${digits}?text=x`,
    );
  });

  it("returns null when no usable number is configured", () => {
    expect(buildWhatsAppUrl(null, "x")).toBeNull();
    expect(buildWhatsAppUrl("", "x")).toBeNull();
    expect(buildWhatsAppUrl("12345", "x")).toBeNull();
  });
});

describe("normalizeRecipient", () => {
  it.each([
    ["9876543210", "919876543210"],
    ["09876543210", "919876543210"],
    ["+91 98765 43210", "919876543210"],
    ["919876543210", "919876543210"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeRecipient(input)).toBe(expected);
  });
});
