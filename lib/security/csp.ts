/**
 * Content-Security-Policy builder (spec §46 security, Phase 11; Phase 24 fix).
 *
 * Nonce-based: proxy.ts mints a per-request nonce, passes it in on the
 * request headers (the documented Next.js mechanism — the framework then
 * stamps its own bootstrap scripts with it), and sets the built policy on
 * the response.
 *
 * Phase 24 (root-cause fix for production sign-in): script-src previously
 * carried 'strict-dynamic', which makes browsers IGNORE 'self' — only
 * nonce-carrying scripts may load. Next 16 production builds stream
 * additional chunk tags (`/_next/static/immutable/chunks/…`) WITHOUT the
 * nonce, so every client component (the sign-in form first among them)
 * failed to render on real deployments while working locally, where the
 * dev-mode script graph differs. 'strict-dynamic' is therefore dropped:
 * 'self' again covers the framework's own same-origin build assets, and
 * the nonce still gates inline scripts. No third-party script origins are
 * opened — object-src 'none' and the rest of the lockdown are unchanged.
 *
 * Origins the storefront legitimately reaches:
 *   * *.supabase.co — client auth + any browser-side data queries
 *   * res.cloudinary.com — product imagery (CDN)
 *   * api.cloudinary.com — signed direct-from-the-browser media uploads
 *
 * Pure builder — unit-tested; proxy.ts owns the nonce and wiring.
 */

export interface CspOptions {
  nonce: string;
  isDev: boolean;
}

export function buildCsp({ nonce, isDev }: CspOptions): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // The next dev overlay evaluates inline code; production never does.
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Tailwind compiles to a stylesheet, but Next and small components
    // still emit inline style attributes — allowed, inline <style> blocks
    // are not a script-injection vector.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co",
    "font-src 'self' data:",
    // ws: covers the next-dev HMR socket (dev only — localhost).
    `connect-src 'self' https://*.supabase.co https://api.cloudinary.com${
      isDev ? " ws:" : ""
    }`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // http:// subresources are a non-thing in prod; skip in dev so the
    // local http://localhost round-trip is never rewritten.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}
