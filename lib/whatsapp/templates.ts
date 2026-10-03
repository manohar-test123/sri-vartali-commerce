/**
 * Automation reply templates (spec §29, §31) — pure text builders.
 *
 * Phase 6 ships the customer's outgoing §27 order message; Phase 7 owns the
 * store's replies after the customer's message arrives: payment instructions
 * (+ QR), the PAID acknowledgement, and an inactive-order notice. Kept in
 * sync with `lib/orders/whatsapp.ts` styling: plain text, WhatsApp-friendly.
 */

import { formatPaise } from "@/lib/catalog/money";

/** §30 payment settings as the reply layer needs them. */
export interface PaymentSettingsInput {
  businessName: string | null;
  upiId: string | null;
  upiQrUrl: string | null;
  paymentInstructions: string | null;
}

export interface PaymentInstructionsInput {
  customerName: string;
  orderNumber: string;
  totalPaise: number;
  settings: PaymentSettingsInput;
}

/**
 * §29 message: order acknowledgement + payment instructions. The spec's
 * line-for-line shape, with two honest fallbacks when §30 settings are
 * incomplete — a QR-less payment line names the UPI ID instead, and custom
 * `payment_instructions` replace the standard payment sentence verbatim
 * (the owner owns the wording; the envelope stays ours).
 */
export function buildPaymentInstructionsMessage(
  input: PaymentInstructionsInput,
): string {
  const settings = input.settings;
  const hasQr = Boolean(settings.upiQrUrl);
  const hasUpi = Boolean(settings.upiId);

  let paymentLine = "Please complete your payment using the QR code below.";
  if (settings.paymentInstructions?.trim()) {
    paymentLine = settings.paymentInstructions.trim();
  } else if (!hasQr && hasUpi) {
    paymentLine = `Please complete your payment via UPI to ${settings.upiId}.`;
  } else if (!hasQr && !hasUpi) {
    paymentLine =
      "Our team will share payment details with you shortly on this chat.";
  }

  const lines: string[] = [
    `Thank you for your order, ${input.customerName} ✨`,
    "",
    "Order ID:",
    input.orderNumber,
    "",
    "Total:",
    formatPaise(input.totalPaise),
    "",
    paymentLine,
    "",
    "After completing payment, reply:",
    "PAID",
    "",
    "Our team will verify your payment and confirm your order.",
  ];

  return lines.join("\n");
}

/** True when the automation should attach the configured QR image next. */
export function hasQrToSend(settings: PaymentSettingsInput): boolean {
  return Boolean(settings.upiQrUrl?.trim());
}

/**
 * Acknowledgement for a §31 PAID reply. States exactly what happened:
 * the claim is recorded and a human verifies — the automation never
 * confirms payment itself.
 */
export function buildPaidAckMessage(
  input: { customerName: string; orderNumber: string },
): string {
  return [
    `Thank you, ${input.customerName}!`,
    "",
    `We have recorded your payment confirmation for order ${input.orderNumber}.`,
    "",
    "Our team will verify your payment and confirm your order shortly.",
  ].join("\n");
}

/** Reply when the referenced order exists but is no longer payable. */
export function buildInactiveOrderMessage(
  input: { orderNumber: string; businessName: string | null },
): string {
  const store = input.businessName?.trim() || "Sri Vartali Sarees";
  return [
    `Order ${input.orderNumber} is no longer active — it was cancelled or completed.`,
    "",
    `If this is unexpected, please message us here and our team at ${store} will help you place a fresh order.`,
  ].join("\n");
}

/**
 * §33 confirmation — the only place the store says a payment IS confirmed,
 * and it is sent exclusively after a human verified it (§32). The §31 ack
 * deliberately never uses this wording.
 */
export function buildPaymentConfirmedMessage(
  input: { customerName: string; orderNumber: string; totalPaise: number },
): string {
  return [
    "Payment confirmed ✅",
    "",
    `Thank you, ${input.customerName}!`,
    "",
    "Order ID:",
    input.orderNumber,
    "",
    "Amount received:",
    formatPaise(input.totalPaise),
    "",
    "Your order is now being prepared.",
    "",
    "We will message you again with tracking details once it is dispatched.",
  ].join("\n");
}

/**
 * §36 shipping notification — sent when the client clicks MARK SHIPPED
 * (§35 row written first, message second, same logged send path as §33).
 * The tracking URL is optional: without one the "Track your order" block
 * is omitted rather than sending a dead line. The spec's template CTA
 * (TRACK ORDER button) needs a pre-approved Meta template — the plain
 * text link carries the same affordance until Meta is wired.
 */
export function buildShippedMessage(
  input: {
    orderNumber: string;
    courier: string;
    trackingId: string;
    trackingUrl: string | null;
    productCount: number;
    pieceCount: number;
  },
): string {
  const lines: string[] = [
    "Your Sri Vartali order has been shipped 📦✨",
    "",
    "Order ID:",
    input.orderNumber,
    "",
    "Courier:",
    input.courier,
    "",
    "Tracking ID:",
    input.trackingId,
  ];
  if (input.trackingUrl) {
    lines.push("", "Track your order:", input.trackingUrl);
  }
  lines.push(
    "",
    "Items:",
    `${input.productCount} ${input.productCount === 1 ? "product" : "products"} / ${input.pieceCount} ${input.pieceCount === 1 ? "piece" : "pieces"}`,
    "",
    "Your order is on its way.",
    "",
    "Thank you for shopping with Sri Vartali Sarees ❤️",
  );
  return lines.join("\n");
}
