"use client";

/**
 * Header wishlist indicator (§7 /wishlist): reads the guest wishlist count
 * client-side after mount — the count is never server-rendered, so no
 * hydration mismatch is possible.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

import { getWishlist, onWishlistChange } from "@/lib/storefront/browser-storage";

export function WishlistBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setCount(getWishlist().length);
    sync();
    return onWishlistChange(sync);
  }, []);

  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist${count !== null && count > 0 ? ` (${count} saved)` : ""}`}
      className="relative rounded-full px-1 py-1 text-wine-900/70 transition-colors hover:text-wine-900"
    >
      <span aria-hidden className="text-base">
        ♡
      </span>
      {count !== null && count > 0 ? (
        <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine-900 px-1 text-[10px] font-semibold text-ivory-50">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
