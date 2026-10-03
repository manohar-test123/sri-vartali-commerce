/**
 * Typed environment access (see .env.example).
 *
 * Values are read lazily and validated at the point of use, so a missing
 * variable produces a clear runtime error for the feature that needs it —
 * not a build failure for the whole app.
 */

const optional = (value: string | undefined): string | undefined =>
  value && value.length > 0 ? value : undefined;

/** Vercel provides bare hosts (no scheme) — sitemap/og URLs need https://. */
const httpsHost = (host: string | undefined): string | undefined =>
  host ? `https://${host}` : undefined;

export const env = {
  // Explicit override wins; else the stable production domain Vercel
  // injects; else the per-deployment host; else local dev. Without this
  // chain a missing NEXT_PUBLIC_SITE_URL shipped localhost:3000 into
  // production canonical/og URLs (found during Phase 11 verification).
  siteUrl:
    optional(process.env.NEXT_PUBLIC_SITE_URL) ??
    httpsHost(optional(process.env.VERCEL_PROJECT_PRODUCTION_URL)) ??
    httpsHost(optional(process.env.VERCEL_URL)) ??
    "http://localhost:3000",

  supabase: {
    url: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: optional(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },

  cloudinary: {
    cloudName: optional(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
    apiKey: optional(process.env.CLOUDINARY_API_KEY),
    apiSecret: optional(process.env.CLOUDINARY_API_SECRET),
  },

  whatsapp: {
    phoneNumberId: optional(process.env.WHATSAPP_PHONE_NUMBER_ID),
    businessAccountId: optional(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
    accessToken: optional(process.env.WHATSAPP_ACCESS_TOKEN),
    verifyToken: optional(process.env.WHATSAPP_VERIFY_TOKEN),
    appSecret: optional(process.env.WHATSAPP_APP_SECRET),
    storeNumber: optional(process.env.NEXT_PUBLIC_WHATSAPP_STORE_NUMBER),
  },

  superAdminEmail: optional(process.env.SUPER_ADMIN_EMAIL),
} as const;

/** True when the storefront-facing Supabase credentials are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabase.url && env.supabase.anonKey);
}

/**
 * Throws with an actionable message when a code path requires Supabase
 * credentials that are not configured. Callers render a setup notice
 * instead when `isSupabaseConfigured()` is false.
 */
export function assertSupabaseConfigured(caller: string): void {
  if (env.supabase.url && env.supabase.anonKey) return;
  throw new Error(
    `${caller}: Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).`,
  );
}

/** Throws when the service-role key is missing (admin client). */
export function assertServiceRoleConfigured(caller: string): void {
  if (env.supabase.serviceRoleKey) return;
  throw new Error(
    `${caller}: SUPABASE_SERVICE_ROLE_KEY is not set. It must only ever be used in server code — never in the browser (spec §46).`,
  );
}
