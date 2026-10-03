/**
 * Server-side rate limiting (spec §46 security requirements, Phase 11).
 *
 * Fixed-window counters in Postgres via hit_rate_limit() — no Redis, no
 * extra infrastructure (§55 rule 23). Buckets key on the caller's IP as
 * seen by the platform (x-forwarded-for on Vercel; "unknown" for local
 * direct hits), which is the only identity anonymous storefront actions
 * have. Signed-in dashboard mutations stay unlimited: they are already
 * role-gated, audited, and low-volume.
 *
 * Fail-open: if the counter is unreachable (e.g. the migration has not run
 * on a branch preview), the request proceeds and the failure is logged —
 * a broken limiter must not take checkout down. Availability note is in
 * supabase/migrations/20261003150000_rate_limiting_phase11.sql.
 */

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/db/admin";

export type RateLimitKind =
  | "order_place"
  | "login_ip"
  | "login_email"
  | "review_submit"
  | "track_order";

/** Limits are per IP (or per email where noted) — tune in one place. */
export const RATE_LIMITS: Record<
  RateLimitKind,
  { limit: number; windowSeconds: number }
> = {
  // Each placed order reserves stock; a burst floods reservations.
  order_place: { limit: 6, windowSeconds: 3600 },
  // Brute-force guard on both sign-in paths.
  login_ip: { limit: 10, windowSeconds: 900 },
  // Magic-link mail bomber guard (per recipient address).
  login_email: { limit: 5, windowSeconds: 3600 },
  review_submit: { limit: 5, windowSeconds: 3600 },
  // Order-id/phone pair is the credential — slow down enumeration.
  track_order: { limit: 30, windowSeconds: 600 },
};

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Bucket key — pure, unit-tested. */
export function rateLimitKey(kind: RateLimitKind, identity: string): string {
  return `${kind}:${identity.trim().toLowerCase()}`;
}

/**
 * Caller IP from platform headers — pure, unit-tested. x-forwarded-for is
 * a comma list on Vercel ("client, proxy1, proxy2"); the first entry is
 * the origin. No header → "unknown" (all such callers share one bucket,
 * which only ever happens in direct local traffic).
 */
export function clientIdentityFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

interface HitRateLimitRow {
  allowed?: boolean;
  retryAfterSeconds?: number;
}

/** Normalizes the RPC's jsonb answer — pure, unit-tested. */
export function evaluateRateLimit(row: unknown): RateLimitDecision {
  const r = (row ?? {}) as HitRateLimitRow;
  return {
    allowed: r.allowed !== false,
    retryAfterSeconds:
      typeof r.retryAfterSeconds === "number" && r.retryAfterSeconds > 0
        ? Math.ceil(r.retryAfterSeconds)
        : 0,
  };
}

/** "try again in 4 minutes" style copy from a retry-after value. */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return "within a minute";
  const minutes = Math.ceil(seconds / 60);
  return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/**
 * Count a hit against `kind` for `identity` (defaults to the request IP)
 * and return the decision. Never throws: any limiter failure is logged
 * and treated as "allowed" (see module comment).
 */
export async function checkRateLimit(
  kind: RateLimitKind,
  identity?: string,
): Promise<RateLimitDecision> {
  const { limit, windowSeconds } = RATE_LIMITS[kind];
  try {
    const who = identity ?? clientIdentityFromHeaders(await headers());
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("hit_rate_limit", {
      p_key: rateLimitKey(kind, who),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return evaluateRateLimit(data);
  } catch (err) {
    console.error(`rate-limit (${kind}) unavailable — failing open:`, err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
