import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/db/server";

/**
 * Exchange the magic-link token for a session. The email template's redirect
 * lands here with token_hash + type; verifyOtp writes the session cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/account";

  const allowedTypes = ["magiclink", "email", "signup", "recovery"] as const;
  if (!tokenHash || !type || !allowedTypes.includes(type as (typeof allowedTypes)[number])) {
    return NextResponse.redirect(
      new URL("/account/login?error=invalid-link", origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as (typeof allowedTypes)[number],
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/account/login?error=expired-link", origin),
    );
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return NextResponse.redirect(new URL(safeNext, origin));
}
