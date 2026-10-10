/**
 * Content-Security-Policy builder (spec §46 security, Phase 11).
 *
 * Nonce-based: proxy.ts mints a per-request nonce, passes it in on the
 * request headers (the documented Next.js mechanism — the framework then
 * stamps its own bootstrap scripts with it), and sets the built policy on
 * the response. 'strict-dynamic' means the nonce also covers anything Next
 * loads later; a hardcoded allowlist of script URLs is never needed.
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
    "'strict-dynamic'",
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
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com${
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
