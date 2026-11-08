"use server";

import { redirect } from "next/navigation";

import { passwordAuthErrorMessage } from "@/lib/account/auth-errors";
import { createClient as createServerClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { ensureCartToken } from "@/lib/cart/cookies";
import { checkRateLimit, formatRetryAfter } from "@/lib/rate-limit";

export type PasswordActionState = {
  error?: string;
};

/**
 * Password sign-in (§7 /account/login). Phase 28 removed the magic-link
 * flow; Phase 31 adds user-session persistence:
 *   * Default redirect is the homepage (`/`) — signed-in customers land
 *     straight in the store, no intermediate account page.
 *   * The browser's cart is linked to the authenticated user so it can be
 *     restored on any device (if a previous user cart exists with items,
 *     items are merged in).
 *
 * Password recovery keeps its own email flow under /account/forgot-password;
 * the verify route remains for signup-confirmation and recovery links.
 */
export async function passwordSignIn(
  _prev: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password) {
    return { error: "Enter your email and password." };
  }

  // §46 rate limit: per network — password guessing gets slow fast.
  const ipLimit = await checkRateLimit("login_ip");
  if (!ipLimit.allowed) {
    return {
      error: `Too many sign-in attempts. Please try again ${formatRetryAfter(
        ipLimit.retryAfterSeconds,
      )}.`,
    };
  }

  const next = String(formData.get("next") ?? "/");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: passwordAuthErrorMessage(error) };

  // ---- Phase 31: link this browser's cart to the user (cross-device) ----
  if (data.user) {
    try {
      await linkCartToUser(data.user.id);
    } catch {
      // Cart linking is best-effort — sign-in succeeds regardless.
    }
  }

  redirect(safeNext);
}

/**
 * Associate the browser's cart with the authenticated user; if the user
 * already has a previous cart (from another device/session), merge its
 * items into the current cart so nothing is lost.
 */
async function linkCartToUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  const token = await ensureCartToken();

  // Find or create the cart row for this browser's token (ensureCartToken
  // only sets the cookie — the DB row is created lazily, so do it here)
  let { data: currentCart } = await admin
    .from("carts")
    .select("id")
    .eq("cart_token", token)
    .maybeSingle();

  if (!currentCart) {
    const { data: created, error } = await admin
      .from("carts")
      .insert({ cart_token: token })
      .select("id")
      .single();
    if (error || !created) return;
    currentCart = created;
  }

  // Check if the user already has a DIFFERENT cart with items
  const { data: previousCarts } = await admin
    .from("carts")
    .select("id, cart_items(id, variant_id, quantity)")
    .eq("user_id", userId)
    .neq("id", currentCart.id)
    .limit(1);

  const previousCart = previousCarts?.[0];
  if (previousCart && previousCart.cart_items && previousCart.cart_items.length > 0) {
    // Merge previous cart items into the current cart (add quantities)
    for (const item of previousCart.cart_items) {
      const { data: existing } = await admin
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", currentCart.id)
        .eq("variant_id", item.variant_id)
        .maybeSingle();

      if (existing) {
        await admin
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
      } else {
        const { data: variant } = await admin
          .from("cart_items")
          .select("product_id")
          .eq("id", item.id)
          .single();
        await admin.from("cart_items").insert({
          cart_id: currentCart.id,
          variant_id: item.variant_id,
          product_id: variant?.product_id,
          quantity: item.quantity,
        });
      }
    }
    // Remove the old cart
    await admin.from("carts").delete().eq("id", previousCart.id);
  }

  // Link the current cart to the user
  await admin
    .from("carts")
    .update({ user_id: userId })
    .eq("id", currentCart.id);
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
