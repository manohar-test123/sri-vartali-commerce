/**
 * WhatsApp inbound webhook (spec §2 automation, §29-§31, §43-§44).
 *
 * GET  — Meta subscription verification (hub.challenge echo against
 *        WHATSAPP_VERIFY_TOKEN).
 * POST — inbound customer messages and delivery statuses:
 *          * every item dedupes through webhook_events (§44 idempotency —
 *            Meta redelivers on anything but a fast 200);
 *          * inbound text resolves an order (code in text, else sender's
 *            latest) and the automation replies with §29 payment
 *            instructions (+ QR when configured);
 *          * "PAID" only ever sets payment_status = CUSTOMER_CLAIMS_PAID
 *            (§31) — verification stays a human action in Phase 8;
 *          * provider-status callbacks advance whatsapp_messages rows.
 *
 * The handler answers 200 even when an item fails: the failure is recorded
 * on the event row (status FAILED + error) instead of surfacing as an HTTP
 * error Meta would retry forever. Unconfigured credentials likewise never
 * 5xx — sends log FAILED / NOT_CONFIGURED (see lib/whatsapp/send.ts).
 */

import { createAdminClient } from "@/lib/db/admin";
import { env } from "@/lib/env";
import { findOrderForInbound } from "@/lib/whatsapp/lookup";
import {
  messageEventId,
  parseWebhookPayload,
  saysPaid,
  skippedEventId,
  statusEventId,
} from "@/lib/whatsapp/parse";
import { sendQrImageMessage, sendTextMessage } from "@/lib/whatsapp/send";
import { verifyMetaSignature } from "@/lib/whatsapp/signature";
import {
  buildInactiveOrderMessage,
  buildPaidAckMessage,
  buildPaymentInstructionsMessage,
  hasQrToSend,
  type PaymentSettingsInput,
} from "@/lib/whatsapp/templates";
import { getStoreSettings, toPaymentSettings } from "@/lib/store/settings";

export const dynamic = "force-dynamic";

const PROVIDER = "whatsapp";

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = env.whatsapp.verifyToken;
  if (!expected) {
    return textResponse("Webhook verify token not configured.", 503);
  }
  if (mode === "subscribe" && token === expected && challenge) {
    return textResponse(challenge, 200);
  }
  return textResponse("Forbidden", 403);
}

/** Returns false when this delivery was already processed (§44). */
async function claimEvent(
  externalEventId: string,
  eventType: string,
  payload: unknown,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_events")
    .insert({
      provider: PROVIDER,
      external_event_id: externalEventId,
      event_type: eventType,
      payload: (payload ?? {}) as Record<string, unknown>,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return false; // unique (provider, external_event_id)
    throw new Error(`webhook_events insert: ${error.message}`);
  }
  return Boolean(data);
}

async function markEvent(
  externalEventId: string,
  patch: { status: "PROCESSED" | "FAILED"; error?: string },
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("webhook_events")
    .update({
      status: patch.status,
      error: patch.error ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("provider", PROVIDER)
    .eq("external_event_id", externalEventId);
}

const STATUS_LADDER: Record<"sent" | "delivered" | "read", string[]> = {
  // Forward-only: never regress a message the provider already advanced.
  sent: ["QUEUED"],
  delivered: ["QUEUED", "SENT"],
  read: ["QUEUED", "SENT", "DELIVERED"],
};

async function applyStatusUpdate(
  wamid: string,
  status: "sent" | "delivered" | "read" | "failed",
  timestamp: string | null,
  errorCode: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const at = timestamp
    ? new Date(Number(timestamp) * 1000).toISOString()
    : new Date().toISOString();

  if (status === "failed") {
    await admin
      .from("whatsapp_messages")
      .update({ status: "FAILED", error_code: errorCode, failed_at: at })
      .eq("provider_message_id", wamid)
      .neq("status", "FAILED");
    return;
  }

  const patch =
    status === "sent"
      ? { status: "SENT" as const, sent_at: at }
      : status === "delivered"
        ? { status: "DELIVERED" as const, delivered_at: at }
        : { status: "READ" as const, read_at: at };
  await admin
    .from("whatsapp_messages")
    .update(patch)
    .eq("provider_message_id", wamid)
    .in("status", STATUS_LADDER[status]);
}

async function logInboundMessage(input: {
  wamid: string;
  fromPhone: string;
  text: string;
  orderId: string | null;
  timestamp: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const at = input.timestamp
    ? new Date(Number(input.timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const { error } = await admin.from("whatsapp_messages").insert({
    order_id: input.orderId,
    recipient_phone: input.fromPhone.replace(/\D/g, ""),
    direction: "INBOUND",
    message_type: "text",
    provider_message_id: input.wamid,
    status: "DELIVERED",
    delivered_at: at,
  });
  if (error) throw new Error(`whatsapp_messages inbound log: ${error.message}`);
}

/** §31: the ONLY state change a PAID message may cause. */
async function recordCustomerClaimsPaid(
  orderId: string,
  orderNumber: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ payment_status: "CUSTOMER_CLAIMS_PAID" })
    .eq("id", orderId)
    .eq("payment_status", "PENDING")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`orders PAID claim: ${error.message}`);

  if (data) {
    await admin.from("audit_logs").insert({
      actor_profile_id: null,
      action: "payment.claim",
      entity_type: "order",
      entity_id: orderId,
      new_value: {
        order_number: orderNumber,
        source: "whatsapp",
        payment_status: "CUSTOMER_CLAIMS_PAID",
      },
    });
  }
  return Boolean(data); // false = already claimed/verified → idempotent no-op
}

async function processInboundMessage(
  message: {
    wamid: string;
    fromPhone: string;
    profileName: string | null;
    text: string;
    timestamp: string | null;
    phoneNumberId: string | null;
    raw: unknown;
  },
): Promise<void> {
  if (!(await claimEvent(messageEventId(message.wamid), "inbound_message", message.raw))) {
    return;
  }

  try {
    const match = await findOrderForInbound(message.fromPhone, message.text);
    const order = match.matched ? match.order : null;

    await logInboundMessage({
      wamid: message.wamid,
      fromPhone: message.fromPhone,
      text: message.text,
      orderId: order?.id ?? null,
      timestamp: message.timestamp,
    });

    const settings: PaymentSettingsInput = toPaymentSettings(
      await getStoreSettings(),
    );

    if (!order) {
      // Logged, but nothing to automate on — still fully processed.
    } else if (order.order_status !== "CREATED") {
      await sendTextMessage({
        to: message.fromPhone,
        body: buildInactiveOrderMessage({
          orderNumber: order.order_number,
          businessName: settings.businessName,
        }),
        orderId: order.id,
        templateName: "order_inactive",
      });
    } else if (saysPaid(message.text)) {
      await recordCustomerClaimsPaid(order.id, order.order_number);
      await sendTextMessage({
        to: message.fromPhone,
        body: buildPaidAckMessage({
          customerName: order.customer_name,
          orderNumber: order.order_number,
        }),
        orderId: order.id,
        templateName: "paid_ack",
      });
    } else {
      await sendTextMessage({
        to: message.fromPhone,
        body: buildPaymentInstructionsMessage({
          customerName: order.customer_name,
          orderNumber: order.order_number,
          totalPaise: order.total_paise,
          settings,
        }),
        orderId: order.id,
        templateName: "payment_instructions",
      });
      if (hasQrToSend(settings)) {
        await sendQrImageMessage({
          to: message.fromPhone,
          imageUrl: settings.upiQrUrl!,
          orderId: order.id,
        });
      }
    }
    await markEvent(messageEventId(message.wamid), { status: "PROCESSED" });
  } catch (cause) {
    await markEvent(messageEventId(message.wamid), {
      status: "FAILED",
      error: cause instanceof Error ? cause.message : String(cause),
    }).catch(() => undefined);
  }
}

async function processStatus(
  status: {
    wamid: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string | null;
    errorCode: string | null;
    raw: unknown;
  },
): Promise<void> {
  const eventId = statusEventId(status.wamid, status.status);
  if (!(await claimEvent(eventId, "message_status", status.raw))) return;
  try {
    await applyStatusUpdate(
      status.wamid,
      status.status,
      status.timestamp,
      status.errorCode,
    );
    await markEvent(eventId, { status: "PROCESSED" });
  } catch (cause) {
    await markEvent(eventId, {
      status: "FAILED",
      error: cause instanceof Error ? cause.message : String(cause),
    }).catch(() => undefined);
  }
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  // §46: when the app secret is configured, unsigned or tampered deliveries
  // are rejected outright. Without a secret (local dev / pre-setup) the
  // request proceeds — Meta is the only party that knows the callback URL.
  if (env.whatsapp.appSecret) {
    const signature = request.headers.get("X-Hub-Signature-256");
    if (!verifyMetaSignature(rawBody, signature, env.whatsapp.appSecret)) {
      return textResponse("Invalid signature", 401);
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ processed: false }, { status: 200 });
  }

  const parsed = parseWebhookPayload(payload);

  for (const message of parsed.messages) {
    await processInboundMessage(message);
  }
  for (const status of parsed.statuses) {
    await processStatus(status);
  }
  for (const [index, item] of parsed.skipped.entries()) {
    await claimEvent(
      skippedEventId(item.wamid, index),
      `skipped:${item.type}`,
      item,
    ).catch(() => false);
  }

  return Response.json({ processed: true }, { status: 200 });
}
