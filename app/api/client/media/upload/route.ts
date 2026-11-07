import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { env } from "@/lib/env";

/**
 * Product image upload → Supabase Storage (Phase 30).
 *
 * Replaces the Cloudinary signed-upload path: the dashboard POSTs the file
 * here; the server (service-role, behind the same client-role auth gate as
 * every dashboard action) uploads to the public `product-media` bucket and
 * returns the CDN URL. Max 5 MB, images only — the bucket enforces both.
 */

const BUCKET = "product-media";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const session = await getSession();
  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "CLIENT_OWNER" && role !== "CLIENT_STAFF" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Client role required." }, { status: 403 });
  }

  if (!env.supabase.url) {
    return NextResponse.json(
      { error: "Storage is not configured (missing Supabase URL)." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const productCode = String(form?.get("productCode") ?? "").trim();

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!productCode || !/^SVS-P-\d{6}$/.test(productCode)) {
    return NextResponse.json(
      { error: "A valid product code is required (save the draft first)." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is larger than 5 MB — resize or compress it first." },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type (${file.type}). Use JPEG, PNG, WebP or GIF.` },
      { status: 400 },
    );
  }

  // Storage path: <productCode>/<timestamp>-<safe-filename>
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${productCode}/${Date.now()}-${safeName}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 },
    );
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
