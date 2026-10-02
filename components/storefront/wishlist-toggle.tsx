"use client";

/**
 * Wishlist heart (§12): membership in the localStorage wishlist, read as an
 * external store so the pressed state is always in sync — across cards,
 * pages and tabs — without state-mirroring effects.
 */

import { useSyncExternalStore } from "react";

import {
  inWishlistSnapshot,
  subscribeWishlist,
  toggleWishlist,
  type WishlistEntry,
} from "@/lib/storefront/browser-storage";

export function WishlistToggle({
  snapshot,
  size = "sm",
}: {
  snapshot: Omit<WishlistEntry, "addedAt">;
  size?: "sm" | "lg";
}) {
  const pressed = useSyncExternalStore(
    subscribeWishlist,
    () => inWishlistSnapshot(snapshot.id),
    () => false,
  );

  const label = pressed
    ? `Remove ${snapshot.name} from wishlist`
    : `Save ${snapshot.name} to wishlist`;
  const dim = size === "lg" ? "h-11 w-11" : "h-8 w-8";
  const glyph = size === "lg" ? "text-lg" : "text-sm";

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={() => {
        toggleWishlist(snapshot);
      }}
      className={`${dim} flex items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${
        pressed
          ? "border-wine-700 bg-wine-900/90 text-ivory-50"
          : "border-wine-900/15 bg-ivory-50/90 text-wine-900/60 hover:border-wine-700 hover:text-wine-900"
      }`}
    >
      <span aria-hidden className={glyph}>
        {pressed ? "♥" : "♡"}
      </span>
    </button>
  );
}
