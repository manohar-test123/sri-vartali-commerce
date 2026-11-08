import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Wishlist sync (Phase 31): GET returns the signed-in user's wishlist
 * from profiles.wishlist; POST saves the client's localStorage wishlist
 * to the database. Anonymous requests get `{ items: null }` — the client
 * keeps localStorage as the source of truth for guests.
 *
 * The wishlist is a JSON array of product-snapshot objects (same shape
 * as localStorage) — no tracking, no metadata, just the saved pieces.
 */

export async function GET() {
  const session = await getSession();
  if (session.status !== "authenticated") {
    return NextResponse.json({ items: null });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("wishlist")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ items: null });
  return NextResponse.json({ items: data.wishlist ?? [] });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (session.status !== "authenticated") {
    return NextResponse.json({ synced: false }, { status: 200 });
  }

  const body = (await request.json().catch(() => ({}))) as { items?: unknown[] };
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  // Cap at 500 entries — the wishlist holds product snapshots, not a DB.
  const items = body.items.slice(0, 500);

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ wishlist: items, updated_at: new Date().toISOString() })
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json({ error: "Could not save wishlist." }, { status: 500 });
  }
  return NextResponse.json({ synced: true });
}
