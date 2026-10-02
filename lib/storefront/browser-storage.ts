/**
 * Guest wishlist + recently viewed (§12 wishlist, §13 recently viewed).
 *
 * "use client" helpers over localStorage. The v1 wishlist is guest-local:
 * the DB wishlist tables are customer-account-scoped (customers.user_id) and
 * customer accounts arrive with checkout in a later phase — until then the
 * heart persists per browser, and each entry carries enough of a snapshot
 * to render a card plus a live link to the product page.
 */

import type { StoreProductSummary } from "@/lib/storefront/types";

const WISHLIST_KEY = "svs-wishlist-v1";
const RECENT_KEY = "svs-recent-v1";
const RECENT_LIMIT = 8;
const WISHLIST_EVENT = "svs:wishlist-changed";

/** What we persist per hearted product — a display snapshot, not a price of record. */
export interface WishlistEntry {
  id: string;
  slug: string;
  name: string;
  productCode: string;
  categoryName: string | null;
  pricePaise: number;
  imageUrl: string | null;
  imageAlt: string | null;
  addedAt: string;
}

export interface RecentEntry {
  slug: string;
  name: string;
  productCode: string;
  imageUrl: string | null;
  pricePaise: number;
}

export function snapshotForWishlist(
  p: StoreProductSummary,
): Omit<WishlistEntry, "addedAt"> {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    productCode: p.productCode,
    categoryName: p.categoryParentName ?? p.categoryName,
    pricePaise: p.pricePaise,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt || p.name,
  };
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota: the wishlist simply doesn't persist.
  }
}

export function getWishlist(): WishlistEntry[] {
  return read<WishlistEntry>(WISHLIST_KEY);
}

export function inWishlist(productId: string): boolean {
  return getWishlist().some((e) => e.id === productId);
}

/** Add (or remove) a product; returns the new membership state. */
export function toggleWishlist(
  snapshot: Omit<WishlistEntry, "addedAt">,
): boolean {
  const current = getWishlist();
  const existing = current.some((e) => e.id === snapshot.id);
  const next = existing
    ? current.filter((e) => e.id !== snapshot.id)
    : [{ ...snapshot, addedAt: new Date().toISOString() }, ...current];
  write(WISHLIST_KEY, next);
  notifyWishlist();
  return !existing;
}

export function removeFromWishlist(productId: string): void {
  write(
    WISHLIST_KEY,
    getWishlist().filter((e) => e.id !== productId),
  );
  notifyWishlist();
}

/** Cross-component/cross-tab sync for heart states and header count. */
export function notifyWishlist(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WISHLIST_EVENT));
  window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_KEY }));
}

export function onWishlistChange(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(WISHLIST_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(WISHLIST_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function recordRecentlyViewed(entry: RecentEntry): void {
  const next = [
    entry,
    ...read<RecentEntry>(RECENT_KEY).filter((e) => e.slug !== entry.slug),
  ].slice(0, RECENT_LIMIT);
  write(RECENT_KEY, next);
}

export function getRecentlyViewed(excludeSlug?: string): RecentEntry[] {
  return read<RecentEntry>(RECENT_KEY).filter((e) => e.slug !== excludeSlug);
}
