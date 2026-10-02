"use client";

/**
 * Header wishlist indicator (§7 /wishlist): the guest wishlist count read
 * as an external store — never server-rendered, so no hydration mismatch.
 */

import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  getWishlistSnapshot,
  subscribeWishlist,
} from "@/lib/storefront/browser-storage";

export function WishlistBadge() {
  const count = useSyncExternalStore(
    subscribeWishlist,
    () => getWishlistSnapshot().length,
    () => 0,
  );

  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist${count > 0 ? ` (${count} saved)` : ""}`}
      className="relative rounded-full px-1 py-1 text-wine-900/70 transition-colors hover:text-wine-900"
    >
      <span aria-hidden className="text-base">
        ♡
      </span>
      {count > 0 ? (
        <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine-900 px-1 text-[10px] font-semibold text-ivory-50">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
