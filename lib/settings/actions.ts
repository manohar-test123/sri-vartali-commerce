"use server";

/**
 * Payment & WhatsApp settings mutations (spec §30).
 *
 * Only CLIENT_OWNER and SUPER_ADMIN may change these — the role gate here is
 * the spec rule, RLS (store_settings_update_owner_admin) is the enforcement
 * layer beneath it, and the change lands in audit_logs (§45).
 *
 * whatsapp_store_number rides along: it is the §27 deep-link target that
 * until now could only be set in SQL, so the owner finally has a UI for it.
 */

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { getStoreSettings } from "@/lib/store/settings";
import {
  validateSettingsInput,
  type SettingsInput,
} from "@/lib/settings/validation";

export type SettingsActionResult =
  | { ok: true; message: string }
  | { ok: false; errors: Record<string, string> };

export async function updatePaymentSettingsAction(
  data: FormData,
): Promise<SettingsActionResult> {
  const session = await getSession();
  if (session.status !== "authenticated") {
    return { ok: false, errors: { _form: "Sign in required." } };
  }
  const role = session.user.role;
  if (role !== "CLIENT_OWNER" && role !== "SUPER_ADMIN") {
    // §30: CLIENT_STAFF may read the dashboard but never change payment settings.
    return {
      ok: false,
      errors: { _form: "Only the client owner or a super admin may change payment settings." },
    };
  }

  const input: SettingsInput = {
    businessName: String(data.get("businessName") ?? ""),
    upiId: String(data.get("upiId") ?? ""),
    upiQrUrl: String(data.get("upiQrUrl") ?? ""),
    paymentInstructions: String(data.get("paymentInstructions") ?? ""),
    whatsappStoreNumber: String(data.get("whatsappStoreNumber") ?? ""),
  };
  const errors = validateSettingsInput(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const before = await getStoreSettings();
  const admin = createAdminClient();
  const { error } = await admin
    .from("store_settings")
    .update({
      business_name: input.businessName.trim(),
      upi_id: input.upiId.trim() || null,
      upi_qr_url: input.upiQrUrl.trim() || null,
      payment_instructions: input.paymentInstructions.trim() || null,
      whatsapp_store_number: input.whatsappStoreNumber.trim() || null,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    return { ok: false, errors: { _form: `Save failed: ${error.message}` } };
  }

  await admin.from("audit_logs").insert({
    actor_profile_id: session.user.id,
    actor_role: role,
    action: "settings.payment_update",
    entity_type: "store_settings",
    entity_id: "1",
    old_value: before
      ? {
          business_name: before.business_name,
          upi_id: before.upi_id,
          upi_qr_url: before.upi_qr_url,
          payment_instructions: before.payment_instructions,
          whatsapp_store_number: before.whatsapp_store_number,
        }
      : null,
    new_value: {
      business_name: input.businessName.trim(),
      upi_id: input.upiId.trim() || null,
      upi_qr_url: input.upiQrUrl.trim() || null,
      payment_instructions: input.paymentInstructions.trim() || null,
      whatsapp_store_number: input.whatsappStoreNumber.trim() || null,
    },
  });

  revalidatePath("/client/settings");
  revalidatePath("/client");
  return { ok: true, message: "Settings saved." };
}
