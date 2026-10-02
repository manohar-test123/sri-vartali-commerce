"use client";

/**
 * Wishlist heart (§12): client-side membership in localStorage via
 * lib/storefront/browser-storage. Renders the same button shape on cards
 * and the product page; hydration-safe (state settles after mount).
 */

import { useEffect, useState } from "react";

import {
  inWishlist,
  onWishlistChange,
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
  // undefined = pre-mount (uncontrolled render); settles on first effect.
  const [active, setActive] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setActive(inWishlist(snapshot.id));
    sync();
    return onWishlistChange(sync);
  }, [snapshot.id]);

  const pressed = active === true;
  const label = pressed ? `Remove ${snapshot.name} from wishlist` : `Save ${snapshot.name} to wishlist`;
  const dim = size === "lg" ? "h-11 w-11" : "h-8 w-8";
  const glyph = size === "lg" ? "text-lg" : "text-sm";

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={() => {
        setActive(toggleWishlist(snapshot));
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
