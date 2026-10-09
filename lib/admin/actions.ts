"use server";

/**
 * §9 super-admin mutations: role changes (§6/§45) and manual webhook-event
 * resolution (§44). Session gate here is the spec rule; RLS is the
 * enforcement layer beneath; every mutation lands in audit_logs via the
 * service-role client (same pattern as payment verification / settings).
 */

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import type { AppRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/db/admin";
import { createClient as createServerClient } from "@/lib/db/server";
import { countActiveSuperAdmins } from "@/lib/admin/queries";
import { isResolvableWebhookStatus, roleChangeGuard } from "@/lib/admin/validation";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireSuperAdmin(): Promise<{ id: string; role: AppRole }> {
  const session = await getSession();
  if (session.status !== "authenticated") {
    throw new Error("Sign in required.");
  }
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Super admin only (§9).");
  }
  return { id: session.user.id, role: session.user.role };
}

/**
 * Change a profile's role. Guarded: a real app role only, and a SUPER_ADMIN
 * can never be demoted while they are the last one — the admin panel must
 * stay reachable (§6). Writes audit_logs (§45) with old/new role.
 */
export async function setUserRole(
  profileId: string,
  targetRole: AppRole,
): Promise<ActionResult> {
  const actor = await requireSuperAdmin();

  const supabase = await createServerClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Profile not found." };

  const activeSuperAdmins = await countActiveSuperAdmins();
  const guard = roleChangeGuard({
    currentRole: target.role as AppRole,
    targetRole,
    activeSuperAdmins,
  });
  if (!guard.ok) return { ok: false, error: guard.reason };
  if (guard.noop) return { ok: true, message: "Role unchanged." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: targetRole, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) return { ok: false, error: `Could not change role: ${error.message}` };

  await admin.from("audit_logs").insert({
    actor_profile_id: actor.id,
    actor_role: actor.role,
    action: "admin.role_change",
    entity_type: "profile",
    entity_id: profileId,
    old_value: { role: target.role },
    new_value: { role: targetRole },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/roles");
  revalidatePath("/admin");
  revalidatePath("/admin/audit");
  return { ok: true, message: `Role set to ${targetRole}.` };
}

/**
 * Manually close a stuck webhook event (04-OPEN-ITEMS §5): RECEIVED/FAILED
 * rows become PROCESSED with processed_at set — the error text stays for
 * history and the decision is audit-logged (§44/§45). Deliberately not a
 * SQL path: the owner approves each click in the UI.
 */
export async function markWebhookEventResolved(eventId: string): Promise<ActionResult> {
  const actor = await requireSuperAdmin();

  const supabase = await createServerClient();
  const { data: event } = await supabase
    .from("webhook_events")
    .select("id, status, provider, external_event_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { ok: false, error: "Webhook event not found." };

  if (!isResolvableWebhookStatus(event.status)) {
    return {
      ok: false,
      error: `Only stuck RECEIVED or FAILED rows can be resolved — this one is ${event.status}.`,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("webhook_events")
    .update({ status: "PROCESSED", processed_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) return { ok: false, error: `Could not resolve: ${error.message}` };

  await admin.from("audit_logs").insert({
    actor_profile_id: actor.id,
    actor_role: actor.role,
    action: "admin.webhook_mark_resolved",
    entity_type: "webhook_event",
    entity_id: eventId,
    old_value: { status: event.status },
    new_value: { status: "PROCESSED" },
  });

  revalidatePath("/admin/webhooks");
  revalidatePath("/admin/audit");
  return { ok: true, message: "Event marked resolved." };
}
