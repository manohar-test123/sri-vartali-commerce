/**
 * Order status model (spec §25) — labels and the transitions the client
 * dashboard may drive. Pure: shared by the detail action panel and the
 * server actions that enforce the same map server-side.
 *
 * Payment transitions (CUSTOMER_CLAIMS_PAID → VERIFIED/REJECTED) land with
 * Phase 8; SHIPPED/DELIVERED with Phase 9 — both extend this map, they
 * don't bypass it.
 */

export type OrderStatus = "CREATED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus =
  | "PENDING"
  | "CUSTOMER_CLAIMS_PAID"
  | "VERIFIED"
  | "REJECTED"
  | "REFUNDED";
export type FulfilmentStatus =
  | "UNFULFILLED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED";

/** Forward-only order of the pre-shipping fulfilment ladder (§25). */
const FULFILMENT_ORDER: FulfilmentStatus[] = [
  "UNFULFILLED",
  "PROCESSING",
  "PACKED",
];

export function canAdvanceFulfilment(
  from: FulfilmentStatus,
  to: FulfilmentStatus,
): boolean {
  const fromIndex = FULFILMENT_ORDER.indexOf(from);
  const toIndex = FULFILMENT_ORDER.indexOf(to);
  return fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex;
}

/** Cancel is a client action while payment is not VERIFIED (§25/§26). */
export function canCancel(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return orderStatus !== "CANCELLED" && orderStatus !== "COMPLETED" && paymentStatus !== "VERIFIED";
}

/** Reservation extension is meaningful exactly while stock is held (§26). */
export function canExtendReservation(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
  reservationExpiresAt: string | null,
): boolean {
  return (
    canCancel(orderStatus, paymentStatus) && reservationExpiresAt !== null
  );
}

/** §32: manual verification is offered while the order is open and its
 *  payment is still unsettled (PENDING or a customer claim). Whitelist,
 *  not blacklist — REJECTED/REFUNDED are terminal for this action too. */
export function canVerifyPayment(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return (
    orderStatus !== "CANCELLED" &&
    orderStatus !== "COMPLETED" &&
    (paymentStatus === "PENDING" || paymentStatus === "CUSTOMER_CLAIMS_PAID")
  );
}

/** §34/§35: MARK SHIPPED is offered on any open order that has not left
 *  the building yet. Forward-only like the pre-shipping ladder — a packed
 *  order ships, a shipped one cannot ship again (returns are a later
 *  phase). Payment is deliberately not a gate: shipping an unverified
 *  order stays the owner's explicit call at the panel. */
export function canMarkShipped(
  orderStatus: OrderStatus,
  fulfilmentStatus: FulfilmentStatus,
): boolean {
  return (
    orderStatus !== "CANCELLED" &&
    orderStatus !== "COMPLETED" &&
    (fulfilmentStatus === "UNFULFILLED" ||
      fulfilmentStatus === "PROCESSING" ||
      fulfilmentStatus === "PACKED")
  );
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Created",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Payment pending",
  CUSTOMER_CLAIMS_PAID: "Customer says paid",
  VERIFIED: "Payment verified",
  REJECTED: "Payment rejected",
  REFUNDED: "Refunded",
};

export const FULFILMENT_STATUS_LABELS: Record<FulfilmentStatus, string> = {
  UNFULFILLED: "Unfulfilled",
  PROCESSING: "Processing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
};

/** Chip colours — tailwind classes per status family. */
export const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-900",
  CUSTOMER_CLAIMS_PAID: "border-sky-300 bg-sky-50 text-sky-900",
  VERIFIED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  REJECTED: "border-red-300 bg-red-50 text-red-900",
  REFUNDED: "border-red-300 bg-red-50 text-red-900",
};

export const FULFILMENT_STATUS_CLASSES: Record<FulfilmentStatus, string> = {
  UNFULFILLED: "border-wine-900/20 bg-wine-900/5 text-wine-900/70",
  PROCESSING: "border-sky-300 bg-sky-50 text-sky-900",
  PACKED: "border-indigo-300 bg-indigo-50 text-indigo-900",
  SHIPPED: "border-violet-300 bg-violet-50 text-violet-900",
  DELIVERED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  RETURNED: "border-red-300 bg-red-50 text-red-900",
};

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  CREATED: "border-wine-900/20 bg-wine-900/5 text-wine-900/70",
  CONFIRMED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  CANCELLED: "border-red-300 bg-red-50 text-red-900",
  COMPLETED: "border-emerald-300 bg-emerald-50 text-emerald-900",
};
