import { describe, expect, it } from "vitest";

import {
  reviewEligibility,
  validateReviewInput,
} from "@/lib/reviews/validation";

describe("validateReviewInput (§13 reviews)", () => {
  const valid = {
    orderNumber: "SVS-ORD-20261002-00129",
    phone: "9876543210",
    rating: "5",
    title: "Lovely kanjivaram",
    body: "Arrived beautifully packed.",
    name: "Meera",
  };

  it("accepts a complete submission and parses rating + phone", () => {
    const result = validateReviewInput(valid);
    expect(result.errors).toEqual({});
    expect(result.rating).toBe(5);
    expect(result.phone).toBe("9876543210");
  });

  it("normalizes phone spacing and lowercases order numbers", () => {
    const result = validateReviewInput({
      ...valid,
      phone: "98765 43210",
      orderNumber: "svs-ord-20261002-00129",
    });
    expect(result.errors).toEqual({});
    expect(result.phone).toBe("9876543210");
  });

  it("rejects malformed order numbers", () => {
    const result = validateReviewInput({ ...valid, orderNumber: "ORDER-12" });
    expect(result.errors.orderNumber).toBeDefined();
  });

  it("rejects invalid phones", () => {
    const result = validateReviewInput({ ...valid, phone: "12345" });
    expect(result.errors.phone).toBeDefined();
    expect(result.phone).toBeNull();
  });

  it("rejects out-of-range ratings", () => {
    expect(validateReviewInput({ ...valid, rating: "0" }).errors.rating).toBeDefined();
    expect(validateReviewInput({ ...valid, rating: "6" }).errors.rating).toBeDefined();
    expect(validateReviewInput({ ...valid, rating: "abc" }).errors.rating).toBeDefined();
  });

  it("allows star-only reviews but caps title/body/name lengths", () => {
    const result = validateReviewInput({
      ...valid,
      title: "",
      body: "",
      name: "",
    });
    expect(result.errors).toEqual({});

    const long = validateReviewInput({
      ...valid,
      title: "x".repeat(81),
      body: "y".repeat(2001),
      name: "z".repeat(81),
    });
    expect(long.errors.title).toBeDefined();
    expect(long.errors.body).toBeDefined();
    expect(long.errors.name).toBeDefined();
  });
});

describe("reviewEligibility (verified purchase)", () => {
  const shippedOrder = {
    order_status: "CREATED",
    fulfilment_status: "SHIPPED",
    customer_id: "cust-1",
  };

  it("answers not_found for a missing order", () => {
    expect(
      reviewEligibility({ order: null, matchingItemIds: ["i1"], reviewedItemIds: [] }),
    ).toEqual({ status: "not_found" });
  });

  it("answers cancelled distinctly once the phone has matched", () => {
    expect(
      reviewEligibility({
        order: { ...shippedOrder, order_status: "CANCELLED" },
        matchingItemIds: ["i1"],
        reviewedItemIds: [],
      }),
    ).toEqual({ status: "cancelled" });
  });

  it("rejects orders that do not contain the product", () => {
    expect(
      reviewEligibility({ order: shippedOrder, matchingItemIds: [], reviewedItemIds: [] }),
    ).toEqual({ status: "product_not_in_order" });
  });

  it("waits until shipped or delivered", () => {
    for (const fulfilment_status of ["UNFULFILLED", "PROCESSING", "PACKED"]) {
      expect(
        reviewEligibility({
          order: { ...shippedOrder, fulfilment_status },
          matchingItemIds: ["i1"],
          reviewedItemIds: [],
        }),
      ).toEqual({ status: "not_shipped_yet" });
    }
  });

  it("allows DELIVERED and SHIPPED, stamping the first unreviewed item", () => {
    for (const fulfilment_status of ["SHIPPED", "DELIVERED"]) {
      expect(
        reviewEligibility({
          order: { ...shippedOrder, fulfilment_status },
          matchingItemIds: ["i1", "i2"],
          reviewedItemIds: ["i1"],
        }),
      ).toEqual({ status: "ok", orderItemId: "i2", customerId: "cust-1" });
    }
  });

  it("blocks a second review of the same order item", () => {
    expect(
      reviewEligibility({
        order: shippedOrder,
        matchingItemIds: ["i1"],
        reviewedItemIds: ["i1"],
      }),
    ).toEqual({ status: "already_reviewed" });
  });
});
