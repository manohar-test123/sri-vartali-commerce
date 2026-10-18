/**
 * Prefilled WhatsApp message for the cart's "Buy via WhatsApp" handoff.
 *
 * Pure — built only from the server-quoted cart (§18/§22: money always
 * comes from live rows, never the browser). No order exists yet; the
 * supplier confirms availability, shipping and payment in the chat that
 * follows. The §2 rule holds: the deep link prefills, the customer sends.
 *
 * buildProductWhatsAppMessage is the single-item sibling used by the
 * product page's purchase block; it is also client-safe (pure values in,
 * string out) so the live quantity/variant selection can rebuild the
 * message as the customer changes it.
 */

import { formatPaise } from "@/lib/catalog/money";
import type { Quote } from "@/lib/checkout/quote";

export interface ProductWhatsAppInput {
  productName: string;
  productCode: string;
  variantName: string | null;
  quantity: number;
  unitPricePaise: number;
}

export function buildProductWhatsAppMessage(
  input: ProductWhatsAppInput,
): string {
  const lines = [
    "Hello Sri Vartali Sarees 👋",
    "",
    "I would like to buy this item from your website:",
    "",
    input.productName,
    `Product ID: ${input.productCode}`,
  ];
  if (input.variantName) lines.push(`Variant: ${input.variantName}`);
  lines.push(
    `Qty: ${input.quantity}`,
    `Unit price: ${formatPaise(input.unitPricePaise)}`,
    `Estimated total: ${formatPaise(input.unitPricePaise * input.quantity)}`,
    "",
    "Please confirm availability and share payment details. Thank you!",
  );
  return lines.join("\n");
}

export function buildCartWhatsAppMessage(quote: Quote): string {
  const lines: string[] = [
    "Hello Sri Vartali Sarees 👋",
    "",
    "I would like to buy these items from your website:",
    "",
  ];

  quote.lines.forEach((line, index) => {
    lines.push(`${index + 1}. ${line.productName}`);
    lines.push(`Product ID: ${line.productCode}`);
    if (line.variantName) lines.push(`Variant: ${line.variantName}`);
    lines.push(`Qty: ${line.quantity}`);
    lines.push(`Price: ${formatPaise(line.lineTotalPaise)}`);
    lines.push("");
  });

  lines.push("ORDER SUMMARY (from website):", "");
  lines.push(`Subtotal: ${formatPaise(quote.totals.subtotalPaise)}`);
  if (quote.totals.discountPaise > 0) {
    lines.push(`Discount: -${formatPaise(quote.totals.discountPaise)}`);
  }
  lines.push(
    `Shipping: ${
      quote.totals.shippingPaise === 0
        ? "Free"
        : formatPaise(quote.totals.shippingPaise)
    }`,
  );
  lines.push(`Estimated total: ${formatPaise(quote.totals.totalPaise)}`);
  lines.push(
    "",
    "Please confirm availability and share payment details. Thank you!",
  );

  return lines.join("\n");
}
