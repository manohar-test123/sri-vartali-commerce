/**
 * Shipping input validation and the §37 track-order ladder — pure.
 *
 * Rule 17 / §35: shipping requires courier + tracking ID; the tracking URL
 * is optional (nullable in the schema) but when present must be an absolute
 * http(s) URL, because the track page and the §36 WhatsApp message both
 * render it as a clickable link.
 */

import type { FulfilmentStatus, PaymentStatus } from "@/lib/orders/status";

export type ShippingInputResult =
  | {
      ok: true;
      value: { courier: string; trackingId: string; trackingUrl: string | null };
    }
  | { ok: false; error: string };

const TRACKING_ID_PATTERN = /^[A-Za-z0-9-]{4,64}$/;

export function normalizeShippingInput(input: {
  courier: string;
  trackingId: string;
  trackingUrl: string;
}): ShippingInputResult {
  const courier = input.courier.trim();
  const trackingId = input.trackingId.trim();
  const trackingUrl = input.trackingUrl.trim();

  if (courier.length < 2 || courier.length > 60) {
    return { ok: false, error: "Courier must be 2-60 characters." };
  }
  if (!TRACKING_ID_PATTERN.test(trackingId)) {
    return {
      ok: false,
      error: "Tracking ID must be 4-64 letters, digits or hyphens.",
    };
  }

  if (trackingUrl === "") {
    return { ok: true, value: { courier, trackingId, trackingUrl: null } };
  }
  let parsed: URL;
  try {
    parsed = new URL(trackingUrl);
  } catch {
    return {
      ok: false,
      error: "Tracking URL must be a full http(s) link, e.g. https://…",
    };
  }
  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    !parsed.hostname.includes(".")
  ) {
    return {
      ok: false,
      error: "Tracking URL must be a full http(s) link, e.g. https://…",
    };
  }
  return { ok: true, value: { courier, trackingId, trackingUrl } };
}

// ---------------------------------------------------------------------------
// §37 track ladder
// ---------------------------------------------------------------------------

export type TrackStepState = "done" | "current" | "todo";

export interface TrackStep {
  key:
    | "received"
    | "payment"
    | "processing"
    | "packed"
    | "shipped"
    | "delivered";
  label: string;
  state: TrackStepState;
}

/** Fulfilment states that mean a stage has been *passed* (order moved on). */
const PASSED_PROCESSING: FulfilmentStatus[] = [
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
];
const PASSED_PACKED: FulfilmentStatus[] = ["SHIPPED", "DELIVERED", "RETURNED"];
const PASSED_SHIPPED: FulfilmentStatus[] = ["DELIVERED", "RETURNED"];

/**
 * The §37 ladder: Order received → Payment confirmed → Processing →
 * Packed → Shipped → Delivered. A step is ✓ when the order has moved past
 * it, ● when the order currently sits at it, ○ for the future — matching
 * the spec's sample (a shipped order shows Processing/Packed ✓, Shipped ●,
 * Delivered ○). Payment confirmed is ✓ once a human verified it. Cancelled
 * orders render a notice instead of this ladder (see the page).
 */
export function buildTrackSteps(input: {
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
}): TrackStep[] {
  const paymentDone = input.paymentStatus === "VERIFIED";
  const done: Record<TrackStep["key"], boolean> = {
    received: true,
    payment: paymentDone,
    processing: PASSED_PROCESSING.includes(input.fulfilmentStatus),
    packed: PASSED_PACKED.includes(input.fulfilmentStatus),
    shipped: PASSED_SHIPPED.includes(input.fulfilmentStatus),
    delivered: input.fulfilmentStatus === "DELIVERED",
  };

  const order: Array<{ key: TrackStep["key"]; label: string }> = [
    { key: "received", label: "Order received" },
    { key: "payment", label: "Payment confirmed" },
    { key: "processing", label: "Processing" },
    { key: "packed", label: "Packed" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  let currentAssigned = false;
  return order.map((step) => {
    if (done[step.key]) return { ...step, state: "done" as const };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...step, state: "current" as const };
    }
    return { ...step, state: "todo" as const };
  });
}
