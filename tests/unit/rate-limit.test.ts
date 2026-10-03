import { describe, expect, it } from "vitest";

import {
  RATE_LIMITS,
  clientIdentityFromHeaders,
  evaluateRateLimit,
  formatRetryAfter,
  rateLimitKey,
} from "@/lib/rate-limit";

/** Pure halves of the limiter — the RPC round-trip is covered by the
 *  Phase 11 live verification (localhost + production read-backs). */
describe("rateLimitKey", () => {
  it("namespaces the bucket by kind and normalizes identity", () => {
    expect(rateLimitKey("order_place", "1.2.3.4")).toBe("order_place:1.2.3.4");
    expect(rateLimitKey("login_email", "  Owner@SVS.LOCAL ")).toBe(
      "login_email:owner@svs.local",
    );
  });
});

describe("clientIdentityFromHeaders", () => {
  it("takes the first x-forwarded-for entry (the origin client)", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1, 10.0.0.2" });
    expect(clientIdentityFromHeaders(h)).toBe("203.0.113.9");
  });

  it("trims stray spaces around the first entry", () => {
    const h = new Headers({ "x-forwarded-for": " 203.0.113.9 ,10.0.0.1" });
    expect(clientIdentityFromHeaders(h)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then a shared unknown bucket", () => {
    expect(clientIdentityFromHeaders(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
    expect(clientIdentityFromHeaders(new Headers())).toBe("unknown");
  });
});

describe("evaluateRateLimit", () => {
  it("reads the RPC answer shape", () => {
    expect(
      evaluateRateLimit({ allowed: false, retryAfterSeconds: 212.4 }),
    ).toEqual({ allowed: false, retryAfterSeconds: 213 });
    expect(evaluateRateLimit({ allowed: true, hits: 3 })).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("treats a malformed row as allowed (fail-open contract)", () => {
    expect(evaluateRateLimit(null)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(evaluateRateLimit({})).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(evaluateRateLimit("junk")).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });
});

describe("formatRetryAfter", () => {
  it("keeps short waits honest and rounds minutes up", () => {
    expect(formatRetryAfter(0)).toBe("within a minute");
    expect(formatRetryAfter(45)).toBe("within a minute");
    expect(formatRetryAfter(60)).toBe("in about 1 minute");
    expect(formatRetryAfter(121)).toBe("in about 3 minutes");
  });
});

describe("RATE_LIMITS", () => {
  it("configures every storefront-exposed surface", () => {
    for (const kind of [
      "order_place",
      "login_ip",
      "login_email",
      "review_submit",
      "track_order",
    ] as const) {
      expect(RATE_LIMITS[kind].limit).toBeGreaterThan(0);
      expect(RATE_LIMITS[kind].windowSeconds).toBeGreaterThan(0);
    }
  });
});
