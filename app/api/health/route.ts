import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + configuration probe (grows into Phase 11 diagnostics). */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    configured: {
      supabase: isSupabaseConfigured(),
    },
    time: new Date().toISOString(),
  });
}
