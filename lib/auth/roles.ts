/**
 * Roles and permissions — spec §6.
 *
 * CUSTOMER        storefront only
 * CLIENT_OWNER    business operations (products, orders, payments, settings)
 * CLIENT_STAFF    business operations, minus payment/UPI settings (spec §30)
 * SUPER_ADMIN     technical operations, in addition to client powers
 *
 * These must stay in sync with the `app_role` enum in supabase/migrations/20261002150000_init_schema.sql.
 */
export const APP_ROLES = [
  "CUSTOMER",
  "CLIENT_OWNER",
  "CLIENT_STAFF",
  "SUPER_ADMIN",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const CLIENT_ROLES: readonly AppRole[] = ["CLIENT_OWNER", "CLIENT_STAFF"];

export function isClientRole(role: AppRole): boolean {
  return role === "CLIENT_OWNER" || role === "CLIENT_STAFF";
}

export function isSuperAdmin(role: AppRole): boolean {
  return role === "SUPER_ADMIN";
}

/** Client dashboard area (/client) — client roles and super admin (spec §6). */
export function canAccessClientArea(role: AppRole): boolean {
  return isClientRole(role) || isSuperAdmin(role);
}

/** Super admin area (/admin) — SUPER_ADMIN only (spec §46). */
export function canAccessAdminArea(role: AppRole): boolean {
  return isSuperAdmin(role);
}

/** Products, categories, collections, inventory (spec §6). */
export function canManageCatalog(role: AppRole): boolean {
  return isClientRole(role) || isSuperAdmin(role);
}

/** Orders, fulfilment, shipping (spec §6). */
export function canManageOrders(role: AppRole): boolean {
  return isClientRole(role) || isSuperAdmin(role);
}

/** Manual payment verification — client-authorized users only (rule 16). */
export function canVerifyPayments(role: AppRole): boolean {
  return isClientRole(role) || isSuperAdmin(role);
}

/** UPI/QR payment settings — CLIENT_OWNER and SUPER_ADMIN only (spec §30). */
export function canManagePaymentSettings(role: AppRole): boolean {
  return role === "CLIENT_OWNER" || isSuperAdmin(role);
}

/** Business settings — CLIENT_OWNER and SUPER_ADMIN (spec §6). */
export function canManageStoreSettings(role: AppRole): boolean {
  return role === "CLIENT_OWNER" || isSuperAdmin(role);
}
