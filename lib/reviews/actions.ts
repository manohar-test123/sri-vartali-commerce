"use server";

/**
 * Review submission (storefront, verified-purchase gated) and moderation
 * (§8 /client/reviews). Submission uses the §37 credential model — order
 * ID + the checkout phone — so guests can review without an account;
 * moderation keeps everything invisible until the client approves
 * (is_approved gates the public read, RLS reviews_select).
 */

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { checkRateLimit, formatRetryAfter } from "@/lib/rate-limit";
import {
  reviewEligibility,
  validateReviewInput,
} from "@/lib/reviews/validation";

export type SubmitReviewResult =
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "error"; error: string }
  | { status: "not_found" }
  | { status: "cancelled" }
  | { status: "product_not_in_order" }
  | { status: "not_shipped_yet" }
  | { status: "already_reviewed" }
  | { status: "submitted" };

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export async function submitReviewAction(
  _prev: SubmitReviewResult | null,
  data: FormData,
): Promise<SubmitReviewResult> {
  const productId = field(data, "productId");
  const input = {
    orderNumber: field(data, "orderNumber"),
    phone: field(data, "phone"),
    rating: field(data, "rating"),
    title: field(data, "title"),
    body: field(data, "body"),
    name: field(data, "name"),
  };

  const { errors, rating, phone } = validateReviewInput(input);
  if (Object.keys(errors).length > 0 || rating === null || phone === null) {
    return { status: "invalid", errors: errors as Record<string, string> };
  }

  // §46 rate limit: the order-id/phone probe surface is public; slow
  // scripted spam down before it reaches the credential check.
  const reviewRate = await checkRateLimit("review_submit");
  if (!reviewRate.allowed) {
    return {
      status: "error",
      error: `Too many reviews submitted from this network ${formatRetryAfter(
        reviewRate.retryAfterSeconds,
      )}. Please try again later.`,
    };
  }

  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id, slug, status")
    .eq("id", productId)
    .maybeSingle();
  if (!product || product.status !== "PUBLISHED") {
    return { status: "error", error: "This product can no longer be reviewed." };
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, order_status, fulfilment_status, phone")
    .eq("order_number", input.orderNumber.trim().toUpperCase())
    .maybeSingle();
  // A miss and a phone mismatch answer identically (§37 model).
  if (!order || order.phone !== phone) return { status: "not_found" };

  const { data: items } = await admin
    .from("order_items")
    .select("id")
    .eq("order_id", order.id)
    .eq("product_id", productId);
  const matchingItemIds = (items ?? []).map((i) => (i as { id: string }).id);

  let reviewedItemIds: string[] = [];
  if (matchingItemIds.length > 0) {
    const { data: existing } = await admin
      .from("reviews")
      .select("order_item_id")
      .in("order_item_id", matchingItemIds);
    reviewedItemIds = (existing ?? []).map(
      (r) => (r as { order_item_id: string | null }).order_item_id ?? "",
    );
  }

  const eligibility = reviewEligibility({
    order: order as {
      order_status: string;
      fulfilment_status: string;
      customer_id: string | null;
    },
    matchingItemIds,
    reviewedItemIds,
  });
  if (eligibility.status !== "ok") {
    return { status: eligibility.status };
  }

  const { error: insertError } = await admin.from("reviews").insert({
    product_id: productId,
    customer_id: eligibility.customerId,
    order_item_id: eligibility.orderItemId,
    customer_name: input.name.trim() || null,
    rating,
    title: input.title.trim() || null,
    body: input.body.trim() || null,
    is_approved: false,
  });
  if (insertError) {
    return { status: "error", error: "The review could not be saved. Try again." };
  }

  revalidatePath(`/product/${product.slug}`);
  return { status: "submitted" };
}

// ---------------------------------------------------------------------------
// Moderation (client role)
// ---------------------------------------------------------------------------

export type ModerationActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireClientRole(context: string): Promise<string | null> {
  const session = await getSession();
  if (session.status !== "authenticated") return `${context}: sign in required.`;
  const role = session.user.role;
  if (role !== "CLIENT_OWNER" && role !== "CLIENT_STAFF" && role !== "SUPER_ADMIN") {
    return `${context}: client role required.`;
  }
  return null;
}

async function audit(
  actorProfileId: string | null,
  actorRole: string,
  action: string,
  entityId: string,
  newValue: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_profile_id: actorProfileId,
    actor_role: actorRole,
    action,
    entity_type: "review",
    entity_id: entityId,
    new_value: newValue,
  });
}

async function revalidateReviewPaths(reviewId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: review } = await admin
    .from("reviews")
    .select("products (slug)")
    .eq("id", reviewId)
    .maybeSingle();
  const row = review as { products: { slug: string } | null } | null;
  if (row?.products?.slug) revalidatePath(`/product/${row.products.slug}`);
  revalidatePath("/client/reviews");
}

/** Approve (publish) or hide a review. */
export async function setReviewApprovalAction(
  reviewId: string,
  approved: boolean,
): Promise<ModerationActionResult> {
  const denied = await requireClientRole("review moderation");
  if (denied) return { ok: false, error: denied };

  const session = await getSession();
  if (session.status !== "authenticated") {
    return { ok: false, error: "review moderation: sign in required." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("reviews")
    .update({ is_approved: approved })
    .eq("id", reviewId);
  if (error) return { ok: false, error: `review update: ${error.message}` };

  await audit(
    session.user.id,
    session.user.role,
    approved ? "review.approved" : "review.hidden",
    reviewId,
    { is_approved: approved },
  );
  await revalidateReviewPaths(reviewId);
  return { ok: true };
}

export async function deleteReviewAction(
  reviewId: string,
): Promise<ModerationActionResult> {
  const denied = await requireClientRole("review deletion");
  if (denied) return { ok: false, error: denied };

  const session = await getSession();
  if (session.status !== "authenticated") {
    return { ok: false, error: "review deletion: sign in required." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("reviews").delete().eq("id", reviewId);
  if (error) return { ok: false, error: `review delete: ${error.message}` };

  await audit(session.user.id, session.user.role, "review.deleted", reviewId, {});
  await revalidateReviewPaths(reviewId);
  return { ok: true };
}
