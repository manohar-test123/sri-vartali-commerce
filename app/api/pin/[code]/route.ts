/**
 * GET /api/pin/[code] — §21 PIN lookup for the checkout form.
 * 200 with {ok, lookup} | {ok:false, reason:"not_found"}; 400 on bad format;
 * 503 when the pincode service is unreachable (checkout stays open).
 */

import { NextResponse } from "next/server";

import { PIN_PATTERN } from "@/lib/checkout/address";
import { lookupPinCode } from "@/lib/checkout/pincode";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!PIN_PATTERN.test(code)) {
    return NextResponse.json(
      { ok: false, reason: "invalid" },
      { status: 400 },
    );
  }

  const result = await lookupPinCode(code);
  if (result.ok) {
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }
  return NextResponse.json(result, {
    status: result.reason === "not_found" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
