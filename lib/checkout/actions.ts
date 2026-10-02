"use server";

/**
 * Checkout review action (spec §20–§22): validate the contact + address
 * server-side, then re-fetch the cart/buy-now source and rebuild the quote
 * from live catalog rows. This is the §22 pipeline through step 9 — order
 * creation (steps 10–16) is Phase 6 and will reuse exactly this quote.
 */

import { getCheckoutView } from "@/lib/cart/queries";
import {
  normalizeIndianPhone,
  normalizedAddress,
  validateAddress,
  validateContact,
  type AddressInput,
} from "@/lib/checkout/address";
import type { CheckoutReviewResult } from "@/lib/checkout/types";

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export async function reviewCheckout(
  data: FormData,
): Promise<CheckoutReviewResult> {
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
    return { status: "invalid", contactErrors, addressErrors };
  }

  const view = await getCheckoutView();
  if (view.quote.lines.length === 0) return { status: "empty" };
  if (!view.quote.ok) return { status: "issues", issues: view.quote.issues };

  return {
    status: "verified",
    checkout: {
      lines: view.quote.lines,
      totals: view.quote.totals,
      contact: {
        fullName: contact.fullName.trim(),
        whatsappPhone: contact.whatsappPhone,
        email: contact.email,
      },
      address: normalizedAddress(address),
      mode: view.mode,
    },
  };
}
