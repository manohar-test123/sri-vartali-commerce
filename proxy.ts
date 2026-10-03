import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { AppRole } from "@/lib/auth/roles";
import { buildCsp } from "@/lib/security/csp";

/**
 * Edge gate (Next 16 proxy convention — the renamed middleware).
 *
 * Two jobs on every page request:
 *   1. Security (Phase 11, §46): mint a per-request CSP nonce, hand it to
 *      Next via the request headers (documented mechanism — Next stamps
 *      its bootstrap scripts with it) and set the policy on the response.
 *   2. Auth: refresh the session and enforce the two staff areas
 *      (spec §6/§9): /client needs a client role (or super admin), /admin
 *      needs SUPER_ADMIN. When Supabase is not configured, requests pass
 *      through and the pages themselves render setup notices.
 */

const CSP_HEADER = "Content-Security-Policy";

function mintNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export default async function proxy(request: NextRequest) {
  const nonce = mintNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER, csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // The rebuilt response must keep the policy the first one carried.
        response.headers.set(CSP_HEADER, csp);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isClientArea = pathname === "/client" || pathname.startsWith("/client/");
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isClientArea && !isAdminArea) return response;

  const loginUrl = new URL("/account/login", request.url);
  loginUrl.searchParams.set("next", pathname);

  if (!user) {
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role: AppRole = profile?.role ?? "CUSTOMER";
  const clientOk = role === "CLIENT_OWNER" || role === "CLIENT_STAFF" || role === "SUPER_ADMIN";
  const adminOk = role === "SUPER_ADMIN";

  if ((isClientArea && !clientOk) || (isAdminArea && !adminOk)) {
    // Authenticated but not authorized: send home with a marker (not to
    // login — they are signed in; the account page explains the role).
    const home = new URL("/", request.url);
    home.searchParams.set("forbidden", pathname);
    return NextResponse.redirect(home);
  }

  return response;
}

// All page routes (not static assets, not API routes — the webhook's
// signature check must stay the first thing it does, and JSON needs no CSP).
export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
