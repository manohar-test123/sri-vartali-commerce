/**
 * Pure guards for the §9 super-admin actions. No I/O — fully unit-tested.
 * The server actions layer these under session checks; RLS remains the
 * enforcement layer beneath (rule 21).
 */

import { APP_ROLES, type AppRole } from "@/lib/auth/roles";

export type RoleChangeCheck =
  | { ok: true; noop: boolean }
  | { ok: false; reason: string };

/**
 * §45/§6 role-integrity rules for setUserRole:
 * - target must be a real app role;
 * - same-role writes are no-ops (still safe to call);
 * - a SUPER_ADMIN may never be demoted while they are the last one —
 *   the panel must stay reachable for the owner.
 */
export function roleChangeGuard(input: {
  currentRole: AppRole;
  targetRole: AppRole;
  activeSuperAdmins: number;
}): RoleChangeCheck {
  if (!APP_ROLES.includes(input.targetRole)) {
    return { ok: false, reason: "Unknown role." };
  }
  if (input.targetRole === input.currentRole) {
    return { ok: true, noop: true };
  }
  if (
    input.currentRole === "SUPER_ADMIN" &&
    input.targetRole !== "SUPER_ADMIN" &&
    input.activeSuperAdmins < 2
  ) {
    return {
      ok: false,
      reason:
        "This is the only super admin — promote another super admin first (§6: the panel must stay reachable).",
    };
  }
  return { ok: true, noop: false };
}

/** Webhook rows that may be manually resolved (§44): stuck intake states. */
const RESOLVABLE_WEBHOOK_STATUSES = new Set(["RECEIVED", "FAILED"]);

export function isResolvableWebhookStatus(status: string): boolean {
  return RESOLVABLE_WEBHOOK_STATUSES.has(status);
}
