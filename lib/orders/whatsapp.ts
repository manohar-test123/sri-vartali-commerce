/**
 * Prefilled WhatsApp order message (spec §27) + wa.me deep link.
 *
 * Pure — building the message needs only order data the server already
 * holds (snapshots, totals, address). Phase 7 owns delivery/webhooks; this
 * is the customer's outgoing "I would like to place an order" text, which
 * the customer taps Send on (§2 — a deep link prefills, it never sends).
 */

import type { AddressInput } from "@/lib/checkout/address";
import { formatPaise } from "@/lib/catalog/money";

export interface WhatsAppOrderLine {
  productName: string;
  productCode: string;
  variantName: string | null;
  quantity: number;
  lineTotalPaise: number;
}

export interface WhatsAppOrderInput {
  orderNumber: string;
  lines: WhatsAppOrderLine[];
  totalPaise: number;
  customerName: string;
  phone: string;
  address: AddressInput;
  orderUrl: string;
}

/** §27 message, line-for-line: greeting, order id, products, totals,
 *  customer, address, order link. Attribute values ride the variant name. */
export function buildOrderWhatsAppMessage(input: WhatsAppOrderInput): string {
  const lines: string[] = [
    "Hello Sri Vartali Sarees 👋",
    "",
    "I would like to place an order.",
    "",
    "Order ID:",
    input.orderNumber,
    "",
    "Products:",
    "",
  ];

  input.lines.forEach((line, index) => {
    lines.push(`${index + 1}. ${line.productName}`);
    lines.push(`Product ID: ${line.productCode}`);
    if (line.variantName) lines.push(`Variant: ${line.variantName}`);
    lines.push(`Qty: ${line.quantity}`);
    lines.push(`Price: ${formatPaise(line.lineTotalPaise)}`);
    lines.push("");
  });

  lines.push("TOTAL:", formatPaise(input.totalPaise), "", "CUSTOMER:");
  lines.push(input.customerName, input.phone, "", "DELIVERY ADDRESS:");

  const addressLines: string[] = [
    input.address.house + ",",
    input.address.street + ",",
    input.address.area + ",",
  ];
  if (input.address.landmark) {
    addressLines.push(`Landmark: ${input.address.landmark},`);
  }
  if (input.address.district) addressLines.push(input.address.district + ",");
  addressLines.push(
    input.address.state
      ? `${input.address.state} - ${input.address.pinCode}`
      : input.address.pinCode,
  );
  lines.push(...addressLines);

  lines.push("", "Order Link:", input.orderUrl);

  return lines.join("\n");
}

/**
 * wa.me URL: `https://wa.me/<digits>?text=<encoded>`. Accepts the store
 * number in any common Indian format ("+91 98…", "098…", "98…"); returns
 * null when no usable number is configured — callers then fall back to the
 * order confirmation page instead of a broken link.
 */
export function buildWhatsAppUrl(
  storeNumber: string | null | undefined,
  message: string,
): string | null {
  const digits = (storeNumber ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Bare 10-digit and 0-prefixed Indian numbers need the country code.
  let full: string;
  if (digits.length === 10) full = `91${digits}`;
  else if (digits.length === 11 && digits.startsWith("0")) full = `91${digits.slice(1)}`;
  else full = digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}
