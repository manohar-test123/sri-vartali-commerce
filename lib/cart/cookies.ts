/**
 * Cart identity cookies (server-only).
 *
 * `svs_cart_token` — random UUID mapping a browser to its `carts` row. The
 * table has no RLS policies on purpose (§18: server-only via the admin
 * client), so the token must never be readable from JavaScript: httpOnly.
 * Created lazily by the first cart mutation (Server Actions can write
 * cookies; Server Components cannot).
 *
 * `svs_buy_now` — §19's temporary cart: exactly one {variantId, quantity},
 * held only while the customer rides the Buy Now → checkout path. Any cart
 * mutation or /cart visit clears it.
 */

import { cookies } from "next/headers";

import type { QuoteRequestLine } from "@/lib/checkout/quote";

const CART_COOKIE = "svs_cart_token";
const BUY_NOW_COOKIE = "svs_buy_now";

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

export async function readBuyNow(): Promise<QuoteRequestLine | null> {
  const store = await cookies();
  const raw = store.get(BUY_NOW_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<QuoteRequestLine>;
    const quantity = parsed.quantity;
    if (
      typeof parsed.variantId === "string" &&
      typeof quantity === "number" &&
      Number.isInteger(quantity) &&
      quantity >= 1
    ) {
      return { variantId: parsed.variantId, quantity };
    }
  } catch {
    // Malformed cookie — treat as absent.
  }
  return null;
}

export async function writeBuyNow(line: QuoteRequestLine): Promise<void> {
  const store = await cookies();
  store.set(BUY_NOW_COOKIE, JSON.stringify(line), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_HOUR_SECONDS,
  });
}

export async function clearBuyNow(): Promise<void> {
  const store = await cookies();
  store.delete(BUY_NOW_COOKIE);
}

const ONE_HOUR_SECONDS = 60 * 60;
