/**
 * store_settings reads (§30) — server-only, admin client.
 *
 * The singleton row carries payment + WhatsApp settings; it holds no secrets
 * (UPI ID and QR are shown to customers by design) and is public-read via
 * RLS. Server code reads it through the admin client for one consistent
 * shape regardless of the caller's auth.
 */

import { createAdminClient } from "@/lib/db/admin";
import type { PaymentSettingsInput } from "@/lib/whatsapp/templates";

export interface StoreSettingsRow {
  business_name: string;
  upi_id: string | null;
  upi_qr_url: string | null;
  payment_instructions: string | null;
  whatsapp_store_number: string | null;
  default_shipping_paise: number;
  free_shipping_threshold_paise: number | null;
}

export async function getStoreSettings(): Promise<StoreSettingsRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("store_settings")
    .select(
      "business_name, upi_id, upi_qr_url, payment_instructions," +
        " whatsapp_store_number, default_shipping_paise," +
        " free_shipping_threshold_paise",
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`store_settings: ${error.message}`);
  return (data as StoreSettingsRow | null) ?? null;
}

/** §30 slice for the automation reply templates. */
export function toPaymentSettings(
  row: StoreSettingsRow | null,
): PaymentSettingsInput {
  return {
    businessName: row?.business_name ?? null,
    upiId: row?.upi_id ?? null,
    upiQrUrl: row?.upi_qr_url ?? null,
    paymentInstructions: row?.payment_instructions ?? null,
  };
}
