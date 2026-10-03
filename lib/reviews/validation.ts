/**
 * Pure review-input and eligibility rules (§12/§13 reviews, §42 reviews
 * table). Kept free of server imports so unit tests cover the gates the
 * submit action enforces.
 */

import { normalizeIndianPhone } from "@/lib/checkout/address";

export const ORDER_NUMBER_PATTERN = /^SVS-ORD-\d{8}-\d+$/;

export type ReviewInputErrors = Partial<
  Record<"orderNumber" | "phone" | "rating" | "title" | "body" | "name", string>
>;

export function validateReviewInput(input: {
  orderNumber: string;
  phone: string;
  rating: string;
  title: string;
  body: string;
  name: string;
}): { errors: ReviewInputErrors; rating: number | null; phone: string | null } {
  const errors: ReviewInputErrors = {};

  const orderNumber = input.orderNumber.trim().toUpperCase();
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
    errors.orderNumber =
      "Enter the order ID from your confirmation (SVS-ORD-…).";
  }

  const phone = normalizeIndianPhone(input.phone);
  if (phone === null) {
    errors.phone = "Enter the 10-digit WhatsApp number used for the order.";
  }

  const rating = Number.parseInt(input.rating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "Pick a rating from 1 to 5 stars.";
  }

  const title = input.title.trim();
  if (title.length > 80) {
    errors.title = "Keep the title under 80 characters.";
  }

  const body = input.body.trim();
  if (body.length > 2000) {
    errors.body = "Keep the review under 2000 characters.";
  }

  const name = input.name.trim();
  if (name.length > 80) {
    errors.name = "Keep your name under 80 characters.";
  }

  return {
    errors,
    rating: errors.rating ? null : (rating as number),
    phone: errors.phone ? null : phone,
  };
}

export type ReviewEligibility =
  | { status: "ok"; orderItemId: string; customerId: string | null }
  | { status: "not_found" }
  | { status: "cancelled" }
  | { status: "product_not_in_order" }
  | { status: "not_shipped_yet" }
  | { status: "already_reviewed" };

/**
 * Verified-purchase gate. The order ID + phone pair is the credential
 * (same model as §37 track-order), then the order must actually contain
 * the product and have left the building: reviews open at SHIPPED /
 * DELIVERED, one review per order item.
 */
export function reviewEligibility(input: {
  order: {
    order_status: string;
    fulfilment_status: string;
    customer_id: string | null;
  } | null;
  matchingItemIds: string[];
  reviewedItemIds: string[];
}): ReviewEligibility {
  const { order } = input;
  if (!order) return { status: "not_found" };
  if (order.order_status === "CANCELLED") return { status: "cancelled" };
  if (input.matchingItemIds.length === 0) {
    return { status: "product_not_in_order" };
  }
  if (order.fulfilment_status !== "SHIPPED" && order.fulfilment_status !== "DELIVERED") {
    return { status: "not_shipped_yet" };
  }
  const reviewed = new Set(input.reviewedItemIds);
  const unreviewed = input.matchingItemIds.find((id) => !reviewed.has(id));
  if (unreviewed === undefined) return { status: "already_reviewed" };
  return {
    status: "ok",
    orderItemId: unreviewed,
    customerId: order.customer_id,
  };
}
