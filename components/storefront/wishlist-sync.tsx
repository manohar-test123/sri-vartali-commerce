"use client";

/**
 * Wishlist DB ↔ localStorage bridge (Phase 31).
 *
 * On mount: fetches the signed-in user's wishlist from the database and
 * writes it to localStorage — so every wishlist component (badge, toggle,
 * page) sees the restored items with zero changes to their code. Anonymous
 * visitors get `items: null` and localStorage stays untouched.
 *
 * On wishlist changes: debounce-pushes localStorage to the database so the
 * items follow the user across devices. Anonymous pushes are a no-op.
 *
 * This component renders nothing — it is a data bridge only.
 */

import { useEffect, useRef } from "react";

import {
  getWishlistSnapshot,
  subscribeWishlist,
  writeWishlist,
} from "@/lib/storefront/browser-storage";

const SYNC_DEBOUNCE_MS = 800;

export function WishlistSync() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Pull: DB → localStorage on every page load (when signed in)
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then(({ items }: { items: unknown[] | null }) => {
        if (cancelled || !Array.isArray(items) || items.length === 0) return;
        const local = getWishlistSnapshot();
        // Only overwrite if the server has MORE items than localStorage
        // (e.g. a new device with an empty localStorage). This preserves
        // any local additions that haven't synced yet.
        if (items.length > local.length) {
          writeWishlist(items as never[]);
          lastSynced.current = JSON.stringify(items);
        }
      })
      .catch(() => {
        // Not signed in or network error — localStorage is the truth.
      });

    // Push: localStorage → DB on every change (debounced)
    const unsubscribe = subscribeWishlist(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const items = getWishlistSnapshot();
        const serialized = JSON.stringify(items);
        if (serialized === lastSynced.current) return; // no change
        lastSynced.current = serialized;
        fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }).catch(() => {
          // Best-effort — the next change will retry.
        });
      }, SYNC_DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return null;
}
