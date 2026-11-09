import { describe, expect, it } from "vitest";

import { buildCsp } from "@/lib/security/csp";

/**
 * Pins the Content-Security-Policy shape after the Phase 24 root-cause fix:
 * scripts are 'self' + 'unsafe-inline' because this Next 16/Turbopack stack
 * never stamps middleware nonces on script tags (verified on live builds:
 * 0/14 nonced — a nonce policy is unenforceable here, and a present nonce
 * would also neutralise 'unsafe-inline'). Everything structural stays
 * locked: no third-party script origins, objects, framing, base, forms,
 * plus the exact storefront third-party lists. If a directive changes,
 * this file is the reason check.
 */
describe("buildCsp", () => {
  it("allows the framework's own scripts — same-origin chunks + inline bootstrap", () => {
    const csp = buildCsp({ isDev: false });
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    // Phase 24: both halves of the old policy were unenforceable —
    // 'strict-dynamic' made browsers ignore 'self' (chunk tags carry no
    // nonce), and no script tag ever received the nonce at all.
    expect(csp).not.toContain("'strict-dynamic'");
    expect(csp).not.toContain("'nonce-");
  });

  it("opens no third-party script origins", () => {
    const csp = buildCsp({ isDev: false });
    const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? "";
    expect(scriptSrc).not.toMatch(/https?:/);
  });

  it("allows exactly the storefront's third parties", () => {
    const csp = buildCsp({ isDev: false });
    expect(csp).toContain("img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co");
    expect(csp).toContain(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com",
    );
  });

  it("locks framing, objects, base and forms", () => {
    const csp = buildCsp({ isDev: false });
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("adds unsafe-eval and the HMR socket only for dev", () => {
    const dev = buildCsp({ isDev: true });
    const prod = buildCsp({ isDev: false });
    expect(dev).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
    expect(dev).toContain(" ws:");
    expect(prod).not.toContain(" ws:");
  });

  it("upgrades insecure requests in production only", () => {
    expect(buildCsp({ isDev: false })).toContain(
      "upgrade-insecure-requests",
    );
    expect(buildCsp({ isDev: true })).not.toContain(
      "upgrade-insecure-requests",
    );
  });
});
