import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { productMediaFolder, signCloudinaryParams } from "@/lib/media/cloudinary";
import { env } from "@/lib/env";

/**
 * Signed Cloudinary upload params for the client CMS (§15B, rule 13 analog).
 *
 * The browser uploads files directly to Cloudinary using these params; the
 * API secret stays server-side. When Cloudinary is not configured the route
 * says so and the UI offers its by-URL fallback instead of failing.
 */

export async function POST(request: Request) {
  const session = await getSession();
  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "CLIENT_OWNER" && role !== "CLIENT_STAFF" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Client role required." }, { status: 403 });
  }

  const cloudName = env.cloudinary.cloudName;
  const apiKey = env.cloudinary.apiKey;
  const apiSecret = env.cloudinary.apiSecret;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ configured: false });
  }

  const body = (await request.json().catch(() => ({}))) as {
    productCode?: string;
  };
  const code = body.productCode?.trim();
  if (!code || !/^SVS-P-\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "A valid product code is required (save the draft first)." },
      { status: 400 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    folder: productMediaFolder(code),
    timestamp,
  };

  return NextResponse.json({
    configured: true,
    cloudName,
    apiKey,
    folder: params.folder,
    timestamp,
    signature: signCloudinaryParams(params, apiSecret),
  });
}
