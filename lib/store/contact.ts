/**
 * Supplier contact resolution for the storefront (single-supplier store).
 *
 * One number serves both the WhatsApp chat and phone calls. Precedence:
 * `store_settings.whatsapp_store_number` (owner-editable from
 * /client/settings) first, then the `NEXT_PUBLIC_WHATSAPP_STORE_NUMBER`
 * env fallback. Returns null when neither is usable — callers hide the
 * contact affordances instead of rendering dead links.
 *
 * Never throws: a Supabase outage or missing service-role key degrades to
 * the env fallback, same as the storefront shell's other soft reads.
 */

import { env } from "@/lib/env";
import { buildWhatsAppUrl } from "@/lib/orders/whatsapp";
import { getStoreSettings } from "@/lib/store/settings";

export interface StoreContact {
  /** The configured number, in whatever format the owner stored it. */
  number: string;
  /** E.164-ish display form ("+91 98765 43210" → "+919876543210"). */
  displayNumber: string;
  /** wa.me chat link with a short greeting prefilled. */
  whatsappUrl: string;
  /** tel: link for direct calls. */
  phoneUrl: string;
}

/** Short prefilled text for chat opens that are not a cart/order handoff. */
export const STORE_CONTACT_GREETING =
  "Hello Sri Vartali Sarees 👋 I have a question about your collection.";

/** Digits only, with the same country-code normalization wa.me needs. */
function normalizeToE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export async function resolveStoreContact(): Promise<StoreContact | null> {
  let number: string | null = null;
  try {
    number = (await getStoreSettings())?.whatsapp_store_number ?? null;
  } catch {
    // Supabase unreachable / not configured yet — try the env fallback.
  }
  number = number ?? env.whatsapp.storeNumber ?? null;
  if (!number) return null;

  const e164 = normalizeToE164(number);
  if (!e164) return null;

  const whatsappUrl = buildWhatsAppUrl(number, STORE_CONTACT_GREETING);
  if (!whatsappUrl) return null;

  return {
    number,
    displayNumber: `+${e164}`,
    whatsappUrl,
    phoneUrl: `tel:+${e164}`,
  };
}
