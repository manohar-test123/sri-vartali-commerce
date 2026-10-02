/**
 * Inbound webhook parsing (spec §44) — pure, defensive, Meta Cloud API shape.
 *
 * The parser never throws: a malformed or unexpected payload yields empty
 * lists plus a `skipped` note, because webhook handlers must answer Meta
 * with 200 and record what happened rather than crash (§54 "error handling").
 */

/** One inbound text message extracted from a webhook delivery. */
export interface InboundMessage {
  /** WhatsApp message id ("wamid.…") — the idempotency key for processing. */
  wamid: string;
  /** Sender's wa_id digits, Meta form ("919876543210"). */
  fromPhone: string;
  profileName: string | null;
  text: string;
  timestamp: string | null;
  phoneNumberId: string | null;
  /** The provider's original message object — stored on webhook_events. */
  raw: unknown;
}

/** One status update for a message we previously sent. */
export interface MessageStatusUpdate {
  wamid: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string | null;
  errorCode: string | null;
  /** The provider's original status object — stored on webhook_events. */
  raw: unknown;
}

export interface ParsedWebhook {
  messages: InboundMessage[];
  statuses: MessageStatusUpdate[];
  /** Non-text inbound messages (image, button, …) — logged, not automated on. */
  skipped: { wamid: string | null; type: string }[];
}

interface Dict {
  [key: string]: unknown;
}

function asDict(value: unknown): Dict | null {
  return typeof value === "object" && value !== null ? (value as Dict) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function parseWebhookPayload(payload: unknown): ParsedWebhook {
  const result: ParsedWebhook = { messages: [], statuses: [], skipped: [] };

  for (const entry of asArray(asDict(payload)?.entry)) {
    for (const change of asArray(asDict(entry)?.changes)) {
      const value = asDict(asDict(change)?.value);
      if (!value) continue;
      const phoneNumberId = asDict(value.metadata)?.phone_number_id;
      const contacts = asArray(value.contacts);
      const nameFor = (waId: string): string | null => {
        const contact = contacts.find(
          (c) => asDict(c)?.wa_id === waId,
        );
        const profileName = asDict(asDict(contact)?.profile)?.name;
        return typeof profileName === "string" ? profileName : null;
      };

      for (const raw of asArray(value.messages)) {
        const message = asDict(raw);
        if (!message) continue;
        const wamid = typeof message.id === "string" ? message.id : null;
        const type = typeof message.type === "string" ? message.type : "";
        const from = typeof message.from === "string" ? message.from : "";
        if (!wamid || !from) continue;

        if (type === "text") {
          const body = asDict(message.text)?.body;
          result.messages.push({
            wamid,
            fromPhone: from,
            profileName: nameFor(from),
            text: typeof body === "string" ? body : "",
            timestamp:
              typeof message.timestamp === "string" ? message.timestamp : null,
            phoneNumberId:
              typeof phoneNumberId === "string" ? phoneNumberId : null,
            raw: message,
          });
        } else {
          result.skipped.push({ wamid, type: type || "unknown" });
        }
      }

      for (const raw of asArray(value.statuses)) {
        const status = asDict(raw);
        if (!status) continue;
        const wamid = typeof status.id === "string" ? status.id : null;
        const state = typeof status.status === "string" ? status.status : "";
        if (!wamid) continue;
        if (state !== "sent" && state !== "delivered" && state !== "read" && state !== "failed") {
          continue;
        }
        const firstError = asDict(asArray(status.errors)[0]);
        result.statuses.push({
          wamid,
          status: state,
          timestamp:
            typeof status.timestamp === "string" ? status.timestamp : null,
          errorCode:
            typeof firstError?.code === "number" ||
            typeof firstError?.code === "string"
              ? String(firstError.code)
              : null,
          raw: status,
        });
      }
    }
  }

  return result;
}

/** §44 idempotency keys: one per dedupe-able item in a delivery. */
export function messageEventId(wamid: string): string {
  return `message:${wamid}`;
}

export function statusEventId(wamid: string, status: string): string {
  return `status:${wamid}:${status}`;
}

/** Non-text inbound items still get an event id so retries dedupe. */
export function skippedEventId(wamid: string | null, index: number): string {
  return wamid ? `skipped:${wamid}` : `skipped:unknown:${index}`;
}

/** External order code (§3) as it appears inside customer message text. */
export const ORDER_CODE_PATTERN = /SVS-ORD-(\d{8})-(\d{5})/i;

/** First §3 order code found in text, uppercased; null when absent. */
export function extractOrderCode(text: string): string | null {
  const match = ORDER_CODE_PATTERN.exec(text);
  return match ? match[0].toUpperCase() : null;
}

/** Orders store 10-digit phones; Meta sends wa_id with the 91 prefix. */
export function phoneMatchesOrdersPhone(
  metaWaId: string,
  orderPhone: string,
): boolean {
  const meta = metaWaId.replace(/\D/g, "");
  const order = orderPhone.replace(/\D/g, "");
  if (meta.length < 10 || order.length < 10) return false;
  return meta.slice(-10) === order.slice(-10);
}

/** Meta wa_id ("919876543210") → the 10-digit key orders store. */
export function phoneLookupKey(metaWaId: string): string | null {
  const digits = metaWaId.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/**
 * §31 "customer says PAID" detection: the word PAID as a standalone token
 * (case-insensitive, punctuation tolerated). A bare "PAID", "paid ✅",
 * "I have paid" all count; "unpaid" does not.
 */
export function saysPaid(text: string): boolean {
  return /(^|[^a-z])paid([^a-z]|$)/i.test(text);
}
