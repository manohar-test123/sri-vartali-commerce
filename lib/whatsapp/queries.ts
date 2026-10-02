/**
 * WhatsApp message log reads (spec §43) — server-only, admin client.
 * Surfaced on the client order detail page so the owner can see exactly
 * what the automation sent (or failed to send) per order.
 */

import { createAdminClient } from "@/lib/db/admin";

export interface WhatsAppMessageRow {
  id: string;
  order_id: string | null;
  recipient_phone: string;
  direction: "OUTBOUND" | "INBOUND";
  message_type: string;
  template_name: string | null;
  provider_message_id: string | null;
  status:
    | "QUEUED"
    | "SENT"
    | "DELIVERED"
    | "READ"
    | "FAILED";
  error_code: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

const MESSAGE_COLUMNS = `id, order_id, recipient_phone, direction, message_type,
  template_name, provider_message_id, status, error_code, sent_at,
  delivered_at, failed_at, created_at`;

export async function listMessagesForOrder(
  orderId: string,
  limit = 20,
): Promise<WhatsAppMessageRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("whatsapp_messages")
    .select(MESSAGE_COLUMNS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`whatsapp_messages: ${error.message}`);
  return (data ?? []) as WhatsAppMessageRow[];
}
