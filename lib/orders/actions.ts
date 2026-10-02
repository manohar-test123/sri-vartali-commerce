"use server";

/**
 * Order mutations (spec §22, §25, §26 — Phase 6).
 *
 * placeOrderAction: the §22 pipeline. Steps 1-9 reuse the exact checkout
 * review path (validation + `getCheckoutView` quote); steps 10-16 run
 * atomically inside the `place_order` SQL function, which re-derives
 * prices, stock and totals from live rows under row locks — the browser
 * only ever supplies ids, quantities and address text, never prices.
 *
 * Dashboard actions (cancel / advance fulfilment / extend reservation) are
 * role-gated server actions; RLS remains the enforcement layer, the guard
 * is defense in depth, and every mutation lands in audit_logs (§45).
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { env } from "@/lib/env";
import { getSession } from "@/lib/auth/session";
import {
  normalizeIndianPhone,
  validateAddress,
  validateContact,
  type AddressInput,
} from "@/lib/checkout/address";
import { getCheckoutView } from "@/lib/cart/queries";
import { clearBuyNow, readCartToken } from "@/lib/cart/cookies";
import { createAdminClient } from "@/lib/db/admin";
import {
  canAdvanceFulfilment,
  canCancel,
  canExtendReservation,
  type FulfilmentStatus,
} from "@/lib/orders/status";
import { getOrderByNumber } from "@/lib/orders/queries";
import { variantLabel } from "@/lib/orders/snapshot";
import { buildOrderWhatsAppMessage, buildWhatsAppUrl } from "@/lib/orders/whatsapp";
import type { QuoteIssue } from "@/lib/checkout/quote";

export type PlaceOrderResult =
  | { status: "invalid"; contactErrors: Record<string, string>; addressErrors: Record<string, string> }
  | { status: "issues"; issues: QuoteIssue[] }
  | { status: "empty" }
  | { status: "error"; error: string }
  | {
      status: "placed";
      orderNumber: string;
      orderUrl: string;
      whatsappUrl: string | null;
    };

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

/** Absolute /order/<number> URL from the serving host (§27 Order Link). */
async function orderUrlFor(orderNumber: string): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (host) {
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}/order/${orderNumber}`;
  }
  return `${env.siteUrl}/order/${orderNumber}`;
}

/** Store WhatsApp number: DB setting wins, env var is the fallback. */
async function storeWhatsAppNumber(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("store_settings")
    .select("whatsapp_store_number")
    .eq("id", 1)
    .maybeSingle();
  return data?.whatsapp_store_number ?? env.whatsapp.storeNumber ?? null;
}

/** §22 steps 10-16 continue from the verified checkout — cart cleared on
 *  success only, so a failed placement loses nothing. */
export async function placeOrderAction(
  data: FormData,
): Promise<PlaceOrderResult> {
  const contact = {
    fullName: field(data, "fullName"),
    whatsappPhone: normalizeIndianPhone(field(data, "whatsappPhone")) ?? "",
    email: field(data, "email") || null,
  };
  const address: AddressInput = {
    pinCode: field(data, "pinCode"),
    house: field(data, "house"),
    street: field(data, "street"),
    area: field(data, "area"),
    landmark: field(data, "landmark") || null,
    district: field(data, "district") || null,
    state: field(data, "state") || null,
    locality: field(data, "locality") || null,
    country: field(data, "country") || "India",
  };

  const contactErrors = validateContact(contact);
  const addressErrors = validateAddress(address);
  if (Object.keys(contactErrors).length > 0 || Object.keys(addressErrors).length > 0) {
    return {
      status: "invalid",
      contactErrors: contactErrors as Record<string, string>,
      addressErrors: addressErrors as Record<string, string>,
    };
  }

  const view = await getCheckoutView();
  if (view.quote.lines.length === 0) return { status: "empty" };
  if (!view.quote.ok) return { status: "issues", issues: view.quote.issues };

  const admin = createAdminClient();
  const { data: placed, error: rpcError } = await admin.rpc("place_order", {
    p_payload: {
      lines: view.quote.lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
      })),
      contact: {
        fullName: contact.fullName.trim(),
        whatsappPhone: contact.whatsappPhone,
        email: contact.email,
      },
      address: {
        pinCode: address.pinCode.trim(),
        house: address.house.trim(),
        street: address.street.trim(),
        area: address.area.trim(),
        landmark: address.landmark?.trim() || null,
        district: address.district?.trim() || null,
        state: address.state?.trim() || null,
        locality: address.locality?.trim() || null,
        country: "India",
      },
    },
  });
  if (rpcError || !placed?.orderNumber) {
    const message = rpcError?.message ?? "unknown error";
    if (message.includes("STOCK_CHANGED") || message.includes("ITEM_UNAVAILABLE")) {
      return {
        status: "error",
        error:
          "Stock or availability just changed while placing your order. Please review your items and place it again.",
      };
    }
    if (message.includes("INVALID_QUANTITY")) {
      return { status: "error", error: "Invalid quantity — please review your items." };
    }
    throw new Error(`place_order: ${message}`);
  }

  // Success: the checkout source is consumed (§18/§19).
  await clearBuyNow();
  const token = await readCartToken();
  if (token) {
    const { data: cart } = await admin
      .from("carts")
      .select("id")
      .eq("cart_token", token)
      .maybeSingle();
    if (cart) {
      await admin.from("cart_items").delete().eq("cart_id", cart.id);
      await admin
        .from("carts")
        .update({ converted_at: new Date().toISOString() })
        .eq("id", cart.id);
    }
  }

  // Message from the PERSISTED order, not the pre-place quote (§27/§43).
  const persisted = await getOrderByNumber(placed.orderNumber);
  const orderUrl = await orderUrlFor(placed.orderNumber);
  let whatsappUrl: string | null = null;
  if (persisted) {
    const storeNumber = await storeWhatsAppNumber();
    whatsappUrl = buildWhatsAppUrl(
      storeNumber,
      buildOrderWhatsAppMessage({
        orderNumber: persisted.order.order_number,
        lines: persisted.items.map((i) => ({
          productName: i.product_name_snapshot,
          productCode: i.product_code_snapshot,
          variantName: variantLabel(i.selected_attributes),
          quantity: i.quantity,
          lineTotalPaise: i.line_total_paise,
        })),
        totalPaise: persisted.order.total_paise,
        customerName: persisted.order.customer_name,
        phone: persisted.order.phone,
        address: persisted.order.shipping_address_snapshot,
        orderUrl,
      }),
    );
  }

  revalidatePath("/cart");
  return {
    status: "placed",
    orderNumber: placed.orderNumber,
    orderUrl,
    whatsappUrl,
  };
}

// ---------------------------------------------------------------------------
// Client dashboard mutations (§25, §26, §34)
// ---------------------------------------------------------------------------

export type DashboardActionResult =
  | { ok: true; message: string | null }
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
    entity_type: "order",
    entity_id: entityId,
    new_value: newValue,
  });
}

/** Cancel an open order and release its reservation atomically (SQL side). */
export async function cancelOrderAction(
  orderId: string,
  note?: string,
): Promise<DashboardActionResult> {
  const denied = await requireClientRole("Cancel order");
  if (denied) return { ok: false, error: denied };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, order_status, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (
    !canCancel(order.order_status as "CREATED", order.payment_status as "PENDING")
  ) {
    return {
      ok: false,
      error:
        "This order can no longer be cancelled here (already closed, or payment verified — use the refund flow).",
    };
  }

  const { error } = await admin.rpc("cancel_order", {
    p_order_id: orderId,
    p_note: note?.trim() ? note.trim() : "",
  });
  if (error) {
    return { ok: false, error: `Cancel failed: ${error.message}` };
  }

  const session = await getSession();
  if (session.status === "authenticated") {
    await audit(session.user.id, session.user.role, "order.cancel", orderId, {
      order_number: order.order_number,
      note: note?.trim() ?? null,
    });
  }
  revalidatePath("/client/orders");
  revalidatePath(`/client/orders/${orderId}`);
  return { ok: true, message: `Order ${order.order_number} cancelled — stock released.` };
}

/** Advance fulfilment along the §25 ladder (PROCESSING / PACKED). */
export async function advanceFulfilmentAction(
  orderId: string,
  to: FulfilmentStatus,
): Promise<DashboardActionResult> {
  const denied = await requireClientRole("Update fulfilment");
  if (denied) return { ok: false, error: denied };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, fulfilment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  const from = order.fulfilment_status as FulfilmentStatus;
  if (!canAdvanceFulfilment(from, to)) {
    return { ok: false, error: `Cannot move fulfilment from ${from} to ${to}.` };
  }

  const { error } = await admin
    .from("orders")
    .update({ fulfilment_status: to })
    .eq("id", orderId)
    .in("fulfilment_status", [from]);
  if (error) return { ok: false, error: `Update failed: ${error.message}` };

  const session = await getSession();
  if (session.status === "authenticated") {
    await audit(session.user.id, session.user.role, "order.fulfilment", orderId, {
      order_number: order.order_number,
      from,
      to,
    });
  }
  revalidatePath("/client/orders");
  revalidatePath(`/client/orders/${orderId}`);
  return { ok: true, message: `Marked ${to.toLowerCase()}.` };
}

/** §26: hold the reserved stock for another 30 minutes. */
export async function extendReservationAction(
  orderId: string,
): Promise<DashboardActionResult> {
  const denied = await requireClientRole("Extend reservation");
  if (denied) return { ok: false, error: denied };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, order_status, payment_status, reservation_expires_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (
    !canExtendReservation(
      order.order_status as "CREATED",
      order.payment_status as "PENDING",
      order.reservation_expires_at,
    )
  ) {
    return { ok: false, error: "No active reservation on this order." };
  }

  const { error } = await admin
    .from("orders")
    .update({ reservation_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() })
    .eq("id", orderId);
  if (error) return { ok: false, error: `Update failed: ${error.message}` };

  const session = await getSession();
  if (session.status === "authenticated") {
    await audit(session.user.id, session.user.role, "order.extend_reservation", orderId, {
      order_number: order.order_number,
      minutes: 30,
    });
  }
  revalidatePath(`/client/orders/${orderId}`);
  return { ok: true, message: "Reservation extended by 30 minutes." };
}
