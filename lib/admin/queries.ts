/**
 * §9 super-admin reads. Server-only: every query rides the caller's
 * session so RLS scopes each table (profiles/whatsapp_messages/
 * webhook_events/audit_logs select = super admin; store_settings is
 * public-read by design). Same contract as lib/catalog/queries.ts.
 */

import { createClient as createServerClient } from "@/lib/db/server";
import type { AppRole } from "@/lib/auth/roles";

/* ── profiles (users / roles) ─────────────────────────────────────────── */

export interface ProfileListRow {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
}

export async function listProfiles(): Promise<ProfileListRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`profiles: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    phone: p.phone,
    role: p.role as AppRole,
    isActive: p.is_active,
    createdAt: p.created_at,
  }));
}

export async function countActiveSuperAdmins(): Promise<number> {
  const supabase = await createServerClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "SUPER_ADMIN")
    .eq("is_active", true);
  return count ?? 0;
}

/* ── whatsapp message log (§43) ───────────────────────────────────────── */

export interface WhatsappMessageRow {
  id: string;
  orderId: string | null;
  recipientPhone: string;
  direction: string;
  messageType: string;
  templateName: string | null;
  status: string;
  errorCode: string | null;
  createdAt: string;
}

export async function listWhatsappMessages(
  status: string | undefined,
): Promise<WhatsappMessageRow[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from("whatsapp_messages")
    .select(
      `id, order_id, recipient_phone, direction, message_type, template_name,
       status, error_code, created_at`,
    )
    .order("created_at", { ascending: false })
    .limit(150);
  if (status && status !== "ALL") {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) throw new Error(`whatsapp_messages: ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id,
    orderId: m.order_id,
    recipientPhone: m.recipient_phone,
    direction: m.direction,
    messageType: m.message_type,
    templateName: m.template_name,
    status: m.status,
    errorCode: m.error_code,
    createdAt: m.created_at,
  }));
}

/* ── webhook events (§44) ─────────────────────────────────────────────── */

export interface WebhookEventRow {
  id: string;
  provider: string;
  externalEventId: string;
  eventType: string | null;
  status: string;
  error: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export async function listWebhookEvents(): Promise<WebhookEventRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("webhook_events")
    .select(
      `id, provider, external_event_id, event_type, status, error,
       received_at, processed_at`,
    )
    .order("received_at", { ascending: false })
    .limit(150);
  if (error) throw new Error(`webhook_events: ${error.message}`);
  return (data ?? []).map((w) => ({
    id: w.id,
    provider: w.provider,
    externalEventId: w.external_event_id,
    eventType: w.event_type,
    status: w.status,
    error: w.error,
    receivedAt: w.received_at,
    processedAt: w.processed_at,
  }));
}

/* ── audit logs (§45) ─────────────────────────────────────────────────── */

export interface AuditLogRow {
  id: string;
  actorProfileId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export async function listAuditLogs(
  action: string | undefined,
  limit = 100,
): Promise<AuditLogRow[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from("audit_logs")
    .select(
      `id, actor_profile_id, actor_role, action, entity_type, entity_id,
       created_at`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (action && action !== "") {
    query = query.eq("action", action);
  }
  const { data, error } = await query;
  if (error) throw new Error(`audit_logs: ${error.message}`);
  return (data ?? []).map((a) => ({
    id: a.id,
    actorProfileId: a.actor_profile_id,
    actorRole: a.actor_role,
    action: a.action,
    entityType: a.entity_type,
    entityId: a.entity_id,
    createdAt: a.created_at,
  }));
}
