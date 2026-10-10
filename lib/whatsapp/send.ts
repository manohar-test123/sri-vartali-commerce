/**
 * WhatsApp outbound send + message logging (spec §43, §54 Phase 7).
 *
 * Every send attempt is a whatsapp_messages row: QUEUED before the provider
 * call, then SENT (+ provider_message_id) or FAILED (+ error_code) after —
 * success and failure are both visible in the log, and a provider outage
 * never loses the fact that a reply was owed.
 *
 * When the Meta Cloud API credentials are absent the row is logged FAILED /
 * NOT_CONFIGURED instead of throwing: the webhook must still answer 200 so
 * Meta does not retry forever, and the gap surfaces in the message log and
 * the /client/settings integration status instead of a crash.
 */

import { createAdminClient } from "@/lib/db/admin";
import { env } from "@/lib/env";

/** Meta Graph API version for the messages endpoint — bump deliberately. */
const GRAPH_API_VERSION = "v22.0";

export interface SendResult {
  ok: boolean;
  /** whatsapp_messages row id — present whenever logging succeeded. */
  logId: string | null;
  providerMessageId: string | null;
  errorCode: string | null;
}

type MessageStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

interface LogRow {
  id: string;
}

async function insertLog(input: {
  recipientPhone: string;
  messageType: string;
  templateName: string | null;
  orderId: string | null;
}): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("whatsapp_messages")
    .insert({
      order_id: input.orderId,
      recipient_phone: input.recipientPhone,
      direction: "OUTBOUND",
      message_type: input.messageType,
      template_name: input.templateName,
      status: "QUEUED",
    })
    .select("id")
    .single();
  if (error) throw new Error(`whatsapp_messages insert: ${error.message}`);
  return (data as LogRow | null)?.id ?? null;
}

async function markLog(
  logId: string | null,
  patch: Partial<{
    status: MessageStatus;
    provider_message_id: string;
    error_code: string;
    sent_at: string;
    failed_at: string;
  }>,
): Promise<void> {
  if (!logId) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("whatsapp_messages")
    .update(patch)
    .eq("id", logId);
  if (error) throw new Error(`whatsapp_messages update: ${error.message}`);
}

function isConfigured(): boolean {
  return Boolean(env.whatsapp.phoneNumberId && env.whatsapp.accessToken);
}

/** Meta expects digits without a leading + in `to` with country code. */
export function normalizeRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

async function callGraphApi(
  body: Record<string, unknown>,
): Promise<{ ok: true; messageId: string } | { ok: false; errorCode: string }> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.whatsapp.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  ).catch((cause: unknown) => {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { networkError: message } as const;
  });

  if ("networkError" in response) {
    return { ok: false, errorCode: `NETWORK: ${response.networkError}` };
  }

  const payload = (await response.json().catch(() => null)) as {
    messages?: { id?: string }[];
    error?: { code?: number | string; message?: string };
  } | null;

  if (!response.ok) {
    const code = payload?.error?.code ?? `HTTP_${response.status}`;
    return { ok: false, errorCode: String(code) };
  }
  const messageId = payload?.messages?.[0]?.id;
  if (!messageId) return { ok: false, errorCode: "NO_MESSAGE_ID" };
  return { ok: true, messageId };
}

async function logAndSend(input: {
  recipientPhone: string;
  messageType: string;
  templateName: string | null;
  orderId: string | null;
  graphBody: Record<string, unknown> | null;
}): Promise<SendResult> {
  const logId = await insertLog({
    recipientPhone: normalizeRecipient(input.recipientPhone),
    messageType: input.messageType,
    templateName: input.templateName,
    orderId: input.orderId,
  });

  if (!isConfigured()) {
    await markLog(logId, {
      status: "FAILED",
      error_code: "NOT_CONFIGURED",
      failed_at: new Date().toISOString(),
    });
    return { ok: false, logId, providerMessageId: null, errorCode: "NOT_CONFIGURED" };
  }

  const result = await callGraphApi(input.graphBody!);
  if (result.ok) {
    await markLog(logId, {
      status: "SENT",
      provider_message_id: result.messageId,
      sent_at: new Date().toISOString(),
    });
    return { ok: true, logId, providerMessageId: result.messageId, errorCode: null };
  }

  await markLog(logId, {
    status: "FAILED",
    error_code: result.errorCode,
    failed_at: new Date().toISOString(),
  });
  return { ok: false, logId, providerMessageId: null, errorCode: result.errorCode };
}

/** §29 text reply. */
export async function sendTextMessage(input: {
  to: string;
  body: string;
  orderId: string | null;
  templateName: string | null;
}): Promise<SendResult> {
  const to = normalizeRecipient(input.to);
  const graphBody = isConfigured()
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: input.body, preview_url: false },
      }
    : null;
  return logAndSend({
    recipientPhone: to,
    messageType: "text",
    templateName: input.templateName,
    orderId: input.orderId,
    graphBody,
  });
}

/** §29 QR image follow-up, sent by public link. */
export async function sendQrImageMessage(input: {
  to: string;
  imageUrl: string;
  orderId: string | null;
}): Promise<SendResult> {
  const to = normalizeRecipient(input.to);
  const graphBody = isConfigured()
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "image",
        image: { link: input.imageUrl },
      }
    : null;
  return logAndSend({
    recipientPhone: to,
    messageType: "image",
    templateName: "payment_qr",
    orderId: input.orderId,
    graphBody,
  });
}
