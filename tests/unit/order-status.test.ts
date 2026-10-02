import { describe, expect, it } from "vitest";

import {
  canAdvanceFulfilment,
  canCancel,
  canExtendReservation,
  canVerifyPayment,
} from "@/lib/orders/status";
import { variantLabel } from "@/lib/orders/snapshot";

describe("canAdvanceFulfilment (§25 ladder)", () => {
  it("allows forward moves only", () => {
    expect(canAdvanceFulfilment("UNFULFILLED", "PROCESSING")).toBe(true);
    expect(canAdvanceFulfilment("UNFULFILLED", "PACKED")).toBe(true);
    expect(canAdvanceFulfilment("PROCESSING", "PACKED")).toBe(true);
    expect(canAdvanceFulfilment("PACKED", "PROCESSING")).toBe(false);
    expect(canAdvanceFulfilment("PROCESSING", "UNFULFILLED")).toBe(false);
    expect(canAdvanceFulfilment("UNFULFILLED", "UNFULFILLED")).toBe(false);
  });

  it("rejects shipping/delivery states until their phase lands", () => {
    expect(canAdvanceFulfilment("PACKED", "SHIPPED")).toBe(false);
    expect(canAdvanceFulfilment("UNFULFILLED", "DELIVERED")).toBe(false);
  });
});

describe("canCancel", () => {
  it("allows cancelling open orders while payment is unverified", () => {
    expect(canCancel("CREATED", "PENDING")).toBe(true);
    expect(canCancel("CONFIRMED", "CUSTOMER_CLAIMS_PAID")).toBe(true);
  });

  it("refuses closed or paid orders", () => {
    expect(canCancel("CANCELLED", "PENDING")).toBe(false);
    expect(canCancel("COMPLETED", "VERIFIED")).toBe(false);
    expect(canCancel("CREATED", "VERIFIED")).toBe(false);
  });
});

describe("canExtendReservation (§26)", () => {
  it("requires an open order with a live reservation", () => {
    const soon = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(canExtendReservation("CREATED", "PENDING", soon)).toBe(true);
    expect(canExtendReservation("CREATED", "PENDING", null)).toBe(false);
    expect(canExtendReservation("CANCELLED", "PENDING", soon)).toBe(false);
    expect(canExtendReservation("CREATED", "VERIFIED", soon)).toBe(false);
  });
});

describe("canVerifyPayment (§32)", () => {
  it("is offered while an open order's payment is unsettled", () => {
    expect(canVerifyPayment("CREATED", "PENDING")).toBe(true);
    expect(canVerifyPayment("CREATED", "CUSTOMER_CLAIMS_PAID")).toBe(true);
    expect(canVerifyPayment("CONFIRMED", "CUSTOMER_CLAIMS_PAID")).toBe(true);
  });

  it("refuses closed orders and settled payments", () => {
    expect(canVerifyPayment("CREATED", "VERIFIED")).toBe(false);
    expect(canVerifyPayment("CREATED", "REJECTED")).toBe(false);
    expect(canVerifyPayment("CREATED", "REFUNDED")).toBe(false);
    expect(canVerifyPayment("CANCELLED", "CUSTOMER_CLAIMS_PAID")).toBe(false);
    expect(canVerifyPayment("COMPLETED", "PENDING")).toBe(false);
  });
});

describe("variantLabel (§24 snapshots)", () => {
  it("flattens attribute values in insertion order", () => {
    expect(variantLabel({ size: "M", color: "Wine" })).toBe("M · Wine");
  });

  it("drops empty values and handles DEFAULT variants", () => {
    expect(variantLabel({ size: "", color: null })).toBeNull();
    expect(variantLabel({})).toBeNull();
    expect(variantLabel(null)).toBeNull();
  });

  it("stringifies non-string values without losing them", () => {
    expect(variantLabel({ blouse_included: true, size: "36" })).toBe(
      "true · 36",
    );
  });
});
