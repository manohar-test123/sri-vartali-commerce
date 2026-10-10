import { describe, expect, it } from "vitest";

import { buildCsp } from "@/lib/security/csp";

/**
 * Pins the Phase 11 Content-Security-Policy shape: nonce + strict-dynamic
 * on scripts, the storefront's legitimate third-party origins, and the
 * dev-only relaxations. If a directive changes, this file is the reason
 * check.
 */
const NONCE = "dGVzdC1ub25jZS0xNg==";

describe("buildCsp", () => {
  it("nonces scripts and opts into strict-dynamic", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`);
  });

  it("allows exactly the storefront's third parties", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain("img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co");
    expect(csp).toContain(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com",
    );
  });

  it("locks framing, objects, base and forms", () => {
    const csp = buildCsp({ nonce: NONCE, isDev: false });
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("adds unsafe-eval and the HMR socket only for dev", () => {
    const dev = buildCsp({ nonce: NONCE, isDev: true });
    const prod = buildCsp({ nonce: NONCE, isDev: false });
    expect(dev).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
    expect(dev).toContain(" ws:");
    expect(prod).not.toContain(" ws:");
  });

  it("upgrades insecure requests in production only", () => {
    expect(buildCsp({ nonce: NONCE, isDev: false })).toContain(
      "upgrade-insecure-requests",
    );
    expect(buildCsp({ nonce: NONCE, isDev: true })).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("varies with the nonce (per-request policy, not a constant)", () => {
    const a = buildCsp({ nonce: "AAAA", isDev: false });
    const b = buildCsp({ nonce: "BBBB", isDev: false });
    expect(a).not.toBe(b);
  });
});
