/**
 * Order lookup for inbound WhatsApp messages (§54 Phase 7 "order lookup").
 *
 * Precedence: an explicit §3 order code in the message text wins (customers
 * paste the §27 message back); otherwise fall back to the sender's most
 * recent order — orders store the 10-digit phone, Meta sends wa_id with the
 * 91 country prefix, so the lookup keys on the last 10 digits. The §26 sweep
 * runs first so the answer reflects reservations that expired meanwhile.
 */

import { createAdminClient } from "@/lib/db/admin";
import { extractOrderCode, phoneLookupKey } from "@/lib/whatsapp/parse";
import { sweepExpiredReservations } from "@/lib/orders/queries";

export interface InboundOrder {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  total_paise: number;
  order_status: "CREATED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  payment_status:
    | "PENDING"
    | "CUSTOMER_CLAIMS_PAID"
    | "VERIFIED"
    | "REJECTED"
    | "REFUNDED";
}

export type InboundOrderMatch =
  | { matched: true; by: "code" | "phone"; order: InboundOrder }
  | { matched: false; codeInText: string | null };

const LOOKUP_COLUMNS =
  "id, order_number, customer_name, phone, total_paise," +
  " order_status, payment_status";

export async function findOrderForInbound(
  fromPhone: string,
  text: string,
): Promise<InboundOrderMatch> {
  await sweepExpiredReservations();
  const admin = createAdminClient();

  const code = extractOrderCode(text);
  if (code) {
    const { data, error } = await admin
      .from("orders")
      .select(LOOKUP_COLUMNS)
      .eq("order_number", code)
      .maybeSingle();
    if (error) throw new Error(`orders lookup: ${error.message}`);
    if (data) {
      return {
        matched: true,
        by: "code",
        order: data as unknown as InboundOrder,
      };
    }
    // The customer references an order we cannot see — do not silently fall
    // back to another order; report the miss with the code.
    return { matched: false, codeInText: code };
  }

  const key = phoneLookupKey(fromPhone);
  if (!key) return { matched: false, codeInText: null };
  const { data, error } = await admin
    .from("orders")
    .select(LOOKUP_COLUMNS)
    .eq("phone", key)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`orders lookup: ${error.message}`);
  if (!data) return { matched: false, codeInText: null };
  return { matched: true, by: "phone", order: data as unknown as InboundOrder };
}
