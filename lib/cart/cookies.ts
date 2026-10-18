/**
 * Cart identity cookie (server-only).
 *
 * `svs_cart_token` — random UUID mapping a browser to its `carts` row. The
 * table has no RLS policies on purpose (§18: server-only via the admin
 * client), so the token must never be readable from JavaScript: httpOnly.
 * Created lazily by the first cart mutation (Server Actions can write
 * cookies; Server Components cannot).
 */

import { cookies } from "next/headers";

const CART_COOKIE = "svs_cart_token";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Read the cart token, if this browser has one yet. */
export async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/**
 * Read the cart token, creating (and setting) one when missing. Only legal
 * inside a Server Action or Route Handler — cookies are read-only in RSC.
 */
export async function ensureCartToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const token = crypto.randomUUID();
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return token;
}
