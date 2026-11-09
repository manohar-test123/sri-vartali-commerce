/**
 * Content-Security-Policy builder (spec §46 security, Phase 11; Phase 24 fix).
 *
 * Phase 24 (root-cause fix for production sign-in): the original policy was
 * `script-src 'self' 'nonce-…' 'strict-dynamic'`. Two framework realities
 * broke it on real deployments while localhost looked fine:
 *   1. 'strict-dynamic' makes browsers IGNORE 'self' — and Next 16
 *      production builds stream chunk tags (/_next/static/immutable/…)
 *      without nonces, so every client component failed to execute.
 *   2. The framework does not stamp the middleware nonce on ANY script
 *      tag on this stack — verified on live builds: 0 of 14 <script>
 *      elements carried a nonce, so inline bootstrap/RSC payloads could
 *      never satisfy a nonce policy. The nonce mechanism is unenforceable
 *      here, and per CSP3 a present nonce also neutralises
 *      'unsafe-inline' — so the nonce is dropped entirely.
 *
 * Result: `script-src 'self' 'unsafe-inline'` — same-origin framework
 * assets plus the framework's own inline bootstrap; React escapes all
 * rendered content and the app injects no untrusted raw HTML, which is
 * the actual XSS guard at this layer. Every structural lockdown stays:
 * no third-party script origins, object-src 'none', base-uri, form-action,
 * frame-ancestors 'none', and the exact third-party lists below.
 *
 * Origins the storefront legitimately reaches:
 *   * *.supabase.co — client auth + any browser-side data queries
 *   * res.cloudinary.com — product imagery (CDN)
 *   * api.cloudinary.com — signed direct-from-the-browser media uploads
 *
 * Pure builder — unit-tested; proxy.ts owns the wiring.
 */

export interface CspOptions {
  isDev: boolean;
}

export function buildCsp({ isDev }: CspOptions): string {
  const scriptSrc = [
    "'self'",
    // Framework inline bootstrap (RSC payloads) cannot carry nonces here.
    "'unsafe-inline'",
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
    // wss://*.supabase.co: the client dashboard's realtime order updates
    // (Phase 12 §39). ws: covers the next-dev HMR socket (dev only).
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
