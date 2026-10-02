"use server";

/**
 * Cart mutations (spec §18, §19). Server Actions only — the browser never
 * writes carts directly (no RLS policies on those tables). Every action
 * re-validates the catalog server-side and clamps quantity to live stock:
 * the client's numbers are a suggestion, never a fact (§22).
 */

import { redirect } from "next/navigation";

import {
  clearBuyNow,
  ensureCartToken,
  writeBuyNow,
} from "@/lib/cart/cookies";
import { createAdminClient } from "@/lib/db/admin";

export type CartActionResult =
  | { ok: true; message: string | null }
  | { ok: false; error: string };

interface ValidatedLine {
  cartId: string | null;
  productId: string;
  variantId: string;
  quantity: number;
  available: number;
}

/**
 * Validate one (variant, quantity) against live catalog state and the
 * caller's cart. Returns the cart id (existing row, if any) plus the
 * clamped quantity. Errors as strings — these go straight to the UI.
 */
async function validateLine(
  variantId: string,
  quantity: number,
): Promise<ValidatedLine | { error: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(variantId)) {
    return { error: "Unknown item." };
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "Quantity must be at least 1." };
  }

  const admin = createAdminClient();
  const token = await ensureCartToken();

  const { data: cart } = await admin
    .from("carts")
    .select("id")
    .eq("cart_token", token)
    .maybeSingle();

  const { data: variant } = await admin
    .from("product_variants")
    .select(
      `id, product_id, is_active,
       products!inner(id, status),
       inventory(variant_id, quantity, reserved_quantity)`,
    )
    .eq("id", variantId)
    .maybeSingle();

  const product = variant
    ? (variant.products as unknown as { id: string; status: string } | null)
    : null;
  if (!variant || !variant.is_active || product?.status !== "PUBLISHED") {
    return { error: "This item is no longer available." };
  }

  const inv = Array.isArray(variant.inventory)
    ? variant.inventory[0]
    : variant.inventory;
  const available = Math.max(
    (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0),
    0,
  );
  if (available < 1) {
    return { error: "This item just sold out." };
  }

  return {
    cartId: cart?.id ?? null,
    productId: product.id,
    variantId,
    quantity: Math.min(quantity, available),
    available,
  };
}

async function cartIdForToken(): Promise<string> {
  const admin = createAdminClient();
  const token = await ensureCartToken();
  const { data: cart } = await admin
    .from("carts")
    .select("id")
    .eq("cart_token", token)
    .maybeSingle();
  if (cart) return cart.id;

  const { data: created, error } = await admin
    .from("carts")
    .insert({ cart_token: token })
    .select("id")
    .single();
  if (error || !created) throw new Error(`carts insert: ${error?.message}`);
  return created.id;
}

/** §18 add: increments when the variant is already in the cart. */
export async function addToCart(
  variantId: string,
  quantity: number,
): Promise<CartActionResult> {
  const validated = await validateLine(variantId, quantity);
  if ("error" in validated) return { ok: false, error: validated.error };

  const admin = createAdminClient();
  const cartId = validated.cartId ?? (await cartIdForToken());

  const { data: existing } = await admin
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle();

  const nextQuantity = Math.min(
    (existing?.quantity ?? 0) + validated.quantity,
    validated.available,
  );

  if (existing) {
    const { error } = await admin
      .from("cart_items")
      .update({ quantity: nextQuantity, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(`cart_items update: ${error.message}`);
  } else {
    const { error } = await admin.from("cart_items").insert({
      cart_id: cartId,
      product_id: validated.productId,
      variant_id: variantId,
      quantity: nextQuantity,
    });
    if (error) throw new Error(`cart_items insert: ${error.message}`);
  }

  // The temporary buy-now cart is void once the real cart changes (§19).
  await clearBuyNow();
  return { ok: true, message: null };
}

/** Set an exact quantity for the caller's cart; 0 removes the line. */
export async function setQuantity(
  variantId: string,
  quantity: number,
): Promise<CartActionResult> {
  const admin = createAdminClient();
  const token = await ensureCartToken();
  const { data: cart } = await admin
    .from("carts")
    .select("id")
    .eq("cart_token", token)
    .maybeSingle();
  if (!cart) return { ok: false, error: "Cart not found." };

  if (quantity < 1) {
    const { error } = await admin
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id)
      .eq("variant_id", variantId);
    if (error) throw new Error(`cart_items delete: ${error.message}`);
    await clearBuyNow();
    return { ok: true, message: null };
  }

  const validated = await validateLine(variantId, quantity);
  if ("error" in validated) return { ok: false, error: validated.error };

  const { error } = await admin
    .from("cart_items")
    .update({
      quantity: validated.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("cart_id", cart.id)
    .eq("variant_id", variantId);
  if (error) throw new Error(`cart_items update: ${error.message}`);

  await clearBuyNow();
  return { ok: true, message: null };
}

/** Remove one line from the caller's cart. */
export async function removeItem(
  variantId: string,
): Promise<CartActionResult> {
  return setQuantity(variantId, 0);
}

/** §19 Buy Now: a temporary single-item cart, then straight to checkout. */
export async function buyNow(
  variantId: string,
  quantity: number,
): Promise<never> {
  const validated = await validateLine(variantId, quantity);
  if ("error" in validated) {
    // Buy Now rides a redirect — surface the failure as a redirect to the
    // product's page? Simplest honest path: back to cart with the message
    // in the query string is overkill; throw so the action errors visibly.
    throw new Error(validated.error);
  }

  await writeBuyNow({
    variantId,
    quantity: validated.quantity,
  });
  redirect("/checkout");
}

/** Leave the Buy Now path: drop the temporary cart and return to /cart. */
export async function abandonBuyNow(): Promise<never> {
  await clearBuyNow();
  redirect("/cart");
}
