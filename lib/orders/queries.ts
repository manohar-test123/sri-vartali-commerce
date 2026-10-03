/**
 * Order reads (spec §23, §24, §34, §38) — server-only, admin client.
 * Orders/order_items carry customer data behind RLS; like carts, every
 * access rides the service-role client inside server code. Public pages
 * (/order/[orderNumber]) render from these reads and deliberately show a
 * coarser view than the client dashboard.
 *
 * Every entry point first runs the §26 reservation sweep so statuses and
 * available stock are truthful without a cron (Free-plan friendly); the
 * sweep is a single indexed UPDATE-per-expired-order RPC.
 */

import { createAdminClient } from "@/lib/db/admin";
import { normalizeIndianPhone } from "@/lib/checkout/address";
import type { AddressInput } from "@/lib/checkout/address";
import type {
  FulfilmentStatus,
  OrderStatus,
  PaymentStatus,
} from "@/lib/orders/status";

export interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  shipping_address_snapshot: AddressInput;
  subtotal_paise: number;
  discount_paise: number;
  shipping_paise: number;
  total_paise: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  fulfilment_status: FulfilmentStatus;
  utr_reference: string | null;
  payment_verified_at: string | null;
  reservation_expires_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_code_snapshot: string;
  product_name_snapshot: string;
  image_snapshot: string | null;
  sku_snapshot: string;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
  selected_attributes: Record<string, unknown>;
}

export interface OrderWithItems {
  order: OrderRow;
  items: OrderItemRow[];
}

/** §35 shipments row as the app reads it. */
export interface ShipmentRow {
  id: string;
  order_id: string;
  courier: string;
  tracking_id: string;
  tracking_url: string | null;
  status: "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED";
  shipped_at: string;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

const SHIPMENT_COLUMNS = `id, order_id, courier, tracking_id, tracking_url,
  status, shipped_at, delivered_at, created_at, updated_at`;

/** Latest shipment for an order (§35) — one live shipment per order in the
 *  current model; re-ship after a return is a later phase. */
export async function getLatestShipment(
  orderId: string,
): Promise<ShipmentRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shipments")
    .select(SHIPMENT_COLUMNS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`shipments: ${error.message}`);
  return (data as ShipmentRow | null) ?? null;
}

export interface TrackOrderView {
  order_number: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  fulfilment_status: FulfilmentStatus;
  created_at: string;
  shipment: ShipmentRow | null;
}

export type TrackOrderResult =
  | { status: "not_found" }
  | { status: "found"; view: TrackOrderView };

/**
 * §37 track-order lookup: order number + the phone used at checkout. A
 * miss and a phone mismatch answer identically ("not_found") so the page
 * never confirms whether an order number exists — the sequential SVS-ORD
 * codes are guessable, the phone is the secret. Anonymous access rides the
 * admin client server-side, same as the public order page.
 */
export async function getTrackOrderView(
  orderNumber: string,
  phone: string,
): Promise<TrackOrderResult> {
  await sweepExpiredReservations();
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return { status: "not_found" };

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select(
      `id, order_number, phone, order_status, payment_status,
       fulfilment_status, created_at`,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(`track order: ${error.message}`);
  if (!order || order.phone !== normalized) return { status: "not_found" };

  return {
    status: "found",
    view: {
      order_number: order.order_number,
      order_status: order.order_status as OrderStatus,
      payment_status: order.payment_status as PaymentStatus,
      fulfilment_status: order.fulfilment_status as FulfilmentStatus,
      created_at: order.created_at,
      shipment: await getLatestShipment(order.id),
    },
  };
}

const ORDER_COLUMNS = `id, order_number, customer_name, phone, email,
  shipping_address_snapshot, subtotal_paise, discount_paise, shipping_paise,
  total_paise, order_status, payment_status, fulfilment_status,
  utr_reference, payment_verified_at,
  reservation_expires_at, paid_at, shipped_at, delivered_at, created_at, updated_at`;

const ITEM_COLUMNS = `id, order_id, product_id, variant_id,
  product_code_snapshot, product_name_snapshot, image_snapshot, sku_snapshot,
  unit_price_paise, quantity, line_total_paise, selected_attributes`;

/** §26 sweep — releases stock from expired reservations. Cheap; call freely. */
export async function sweepExpiredReservations(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("release_expired_reservations");
  if (error) throw new Error(`release_expired_reservations: ${error.message}`);
  return typeof data === "number" ? data : 0;
}

async function itemsFor(admin: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data, error } = await admin
    .from("order_items")
    .select(ITEM_COLUMNS)
    .eq("order_id", orderId)
    .order("sku_snapshot", { ascending: true });
  if (error) throw new Error(`order_items: ${error.message}`);
  return (data ?? []) as unknown as OrderItemRow[];
}

export async function getOrderByNumber(
  orderNumber: string,
): Promise<OrderWithItems | null> {
  await sweepExpiredReservations();
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(`orders: ${error.message}`);
  if (!order) return null;
  return { order: order as unknown as OrderRow, items: await itemsFor(admin, order.id) };
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  await sweepExpiredReservations();
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`orders: ${error.message}`);
  if (!order) return null;
  return { order: order as unknown as OrderRow, items: await itemsFor(admin, order.id) };
}

export type OrderListFilter = "all" | "pending" | "claimed" | "action";

export interface OrderHistoryRow {
  id: string;
  field: "order_status" | "payment_status" | "fulfilment_status";
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  actor_profile_id: string | null;
  created_at: string;
}

/** Status timeline for the detail page (§34) — trigger-written rows. */
export async function listOrderHistory(orderId: string): Promise<OrderHistoryRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("order_status_history")
    .select(
      `id, field, old_value, new_value, note, actor_profile_id, created_at`,
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`order_status_history: ${error.message}`);
  return (data ?? []) as unknown as OrderHistoryRow[];
}

export interface OrderListRow {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  total_paise: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  fulfilment_status: FulfilmentStatus;
  reservation_expires_at: string | null;
  created_at: string;
  items: Array<{
    product_name_snapshot: string;
    image_snapshot: string | null;
    quantity: number;
  }>;
}

/** /client/orders list (§34). Sweeps first so filters see live state. */
export async function listOrders(
  filter: OrderListFilter = "all",
  limit = 100,
): Promise<OrderListRow[]> {
  await sweepExpiredReservations();
  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select(
      `id, order_number, customer_name, phone, total_paise, payment_status,
       order_status, fulfilment_status, reservation_expires_at, created_at,
       items:order_items(product_name_snapshot, image_snapshot, quantity)`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "pending") {
    query = query
      .eq("payment_status", "PENDING")
      .neq("order_status", "CANCELLED");
  } else if (filter === "claimed") {
    query = query.eq("payment_status", "CUSTOMER_CLAIMS_PAID");
  } else if (filter === "action") {
    query = query
      .neq("order_status", "CANCELLED")
      .or(
        `payment_status.eq.CUSTOMER_CLAIMS_PAID,and(order_status.eq.CREATED,reservation_expires_at.lte.${new Date(
          Date.now() + 60 * 60 * 1000,
        ).toISOString()})`,
      );
  }

  const { data, error } = await query;
  if (error) throw new Error(`orders list: ${error.message}`);
  return (data ?? []) as unknown as OrderListRow[];
}

/** §38 dashboard-home counters + action list. */
export interface DashboardStats {
  todayOrders: number;
  pendingPayment: number;
  paidReadyToPack: number;
  shipped: number;
  lowStock: number;
  actionRequired: Array<{
    id: string;
    order_number: string;
    reason: string;
  }>;
}

export async function dashboardStats(): Promise<DashboardStats> {
  const admin = createAdminClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const withinHour = new Date(Date.now() + 60 * 60 * 1000);

  const [
    today,
    pending,
    ready,
    shipped,
    lowStock,
    claimed,
    expiring,
  ] = await Promise.all([
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "PENDING")
      .neq("order_status", "CANCELLED"),
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "VERIFIED")
      .in("fulfilment_status", ["UNFULFILLED", "PROCESSING", "PACKED"]),
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("fulfilment_status", "SHIPPED"),
    admin
      .from("inventory")
      .select(
        `quantity, reserved_quantity, low_stock_threshold,
         products!inner(status)`,
      ),
    admin
      .from("orders")
      .select("id, order_number")
      .eq("payment_status", "CUSTOMER_CLAIMS_PAID")
      .neq("order_status", "CANCELLED")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("orders")
      .select("id, order_number")
      .eq("order_status", "CREATED")
      .eq("payment_status", "PENDING")
      .lt("reservation_expires_at", withinHour.toISOString())
      .gt("reservation_expires_at", new Date().toISOString())
      .order("reservation_expires_at", { ascending: true })
      .limit(10),
  ]);

  if (lowStock.error) {
    throw new Error(`inventory: ${lowStock.error.message}`);
  }
  const lowStockCount = (lowStock.data ?? []).filter(
    (row) =>
      ((row as { products?: { status?: string } }).products?.status ===
        "PUBLISHED") &&
      (row as { quantity: number }).quantity -
        (row as { reserved_quantity: number }).reserved_quantity <=
        (row as { low_stock_threshold: number }).low_stock_threshold,
  ).length;

  return {
    todayOrders: today.count ?? 0,
    pendingPayment: pending.count ?? 0,
    paidReadyToPack: ready.count ?? 0,
    shipped: shipped.count ?? 0,
    lowStock: lowStockCount,
    actionRequired: [
      ...(claimed.data ?? []).map((o) => ({
        id: (o as { id: string }).id,
        order_number: (o as { order_number: string }).order_number,
        reason: "Payment claimed",
      })),
      ...(expiring.data ?? []).map((o) => ({
        id: (o as { id: string }).id,
        order_number: (o as { order_number: string }).order_number,
        reason: "Reservation expiring",
      })),
    ],
  };
}
