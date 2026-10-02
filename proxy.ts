import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { AppRole } from "@/lib/auth/roles";

/**
 * Edge gate (Next 16 proxy convention — the renamed middleware).
 *
 * Refreshes the auth session on every matched request and enforces the two
 * staff areas (spec §6/§9): /client needs a client role (or super admin),
 * /admin needs SUPER_ADMIN. When Supabase is not configured, requests pass
 * through and the pages themselves render setup notices.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
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

export const config = {
  matcher: ["/client/:path*", "/admin/:path*", "/account/:path*"],
};
