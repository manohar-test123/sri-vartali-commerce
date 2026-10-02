/**
 * §30 settings input validation — pure, shared by the server action and
 * unit tests. Lives outside the "use server" module because server-action
 * files may only export async functions.
 */

import { phoneLookupKey } from "@/lib/whatsapp/parse";

export interface SettingsInput {
  businessName: string;
  upiId: string;
  upiQrUrl: string;
  paymentInstructions: string;
  whatsappStoreNumber: string;
}

const UPI_ID_PATTERN = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}$/;

export function validateSettingsInput(
  input: SettingsInput,
): Record<string, string> {
  const errors: Record<string, string> = {};

  const businessName = input.businessName.trim();
  if (businessName.length < 2 || businessName.length > 80) {
    errors.businessName = "Business name must be 2–80 characters.";
  }

  const upiId = input.upiId.trim();
  if (upiId !== "" && !UPI_ID_PATTERN.test(upiId)) {
    errors.upiId =
      "Enter a valid UPI ID (like storename@okhdfcbank), or leave it empty.";
  }

  const upiQrUrl = input.upiQrUrl.trim();
  if (upiQrUrl !== "") {
    try {
      const url = new URL(upiQrUrl);
      if (url.protocol !== "https:") {
        errors.upiQrUrl = "The QR image URL must use https.";
      }
    } catch {
      errors.upiQrUrl = "Enter a valid https URL for the QR image, or leave it empty.";
    }
  }

  if (input.paymentInstructions.length > 1000) {
    errors.paymentInstructions =
      "Payment instructions must stay under 1000 characters.";
  }

  const storeNumber = input.whatsappStoreNumber.trim();
  if (storeNumber !== "") {
    const digits = storeNumber.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 14 || phoneLookupKey(digits) === null) {
      errors.whatsappStoreNumber =
        "Enter the store's WhatsApp number (10-digit Indian or with country code), or leave it empty.";
    }
  }

  return errors;
}
