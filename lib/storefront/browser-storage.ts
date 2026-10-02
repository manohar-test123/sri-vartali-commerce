/**
 * Guest wishlist + recently viewed (§12 wishlist, §13 recently viewed).
 *
 * "use client" helpers over localStorage, exposed as an external store:
 * stable cached snapshots + change notifications, so components subscribe
 * with useSyncExternalStore (no state-mirroring effects). The v1 wishlist
 * is guest-local: the DB wishlist tables are customer-account-scoped
 * (customers.user_id) and customer accounts arrive with checkout in a
 * later phase — until then the heart persists per browser, and each entry
 * carries enough of a snapshot to render a card plus a live product link.
 */

import type { StoreProductSummary } from "@/lib/storefront/types";

const WISHLIST_KEY = "svs-wishlist-v1";
const RECENT_KEY = "svs-recent-v1";
const RECENT_LIMIT = 8;
const WISHLIST_EVENT = "svs:wishlist-changed";
const RECENT_EVENT = "svs:recent-changed";

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

// --- external-store plumbing ------------------------------------------------
// Snapshot caches keep getSnapshot() reference-stable between notifications,
// which is what useSyncExternalStore requires.

let wishlistCache: WishlistEntry[] | null = null;
let recentCache: RecentEntry[] | null = null;

const EMPTY_WISHLIST: WishlistEntry[] = [];
const EMPTY_RECENT: RecentEntry[] = [];

function wishlistsSnapshot(): WishlistEntry[] {
  if (wishlistCache === null) wishlistCache = read<WishlistEntry>(WISHLIST_KEY);
  return wishlistCache;
}

function recentSnapshot(): RecentEntry[] {
  if (recentCache === null) recentCache = read<RecentEntry>(RECENT_KEY);
  return recentCache;
}

function notify(event: string, key: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(event));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function subscribe(events: string[], keys: string[], onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || keys.includes(e.key)) onChange();
  };
  for (const event of events) {
    window.addEventListener(event, onChange);
  }
  window.addEventListener("storage", onStorage);
  return () => {
    for (const event of events) {
      window.removeEventListener(event, onChange);
    }
    window.removeEventListener("storage", onStorage);
  };
}

export function subscribeWishlist(onChange: () => void): () => void {
  return subscribe([WISHLIST_EVENT], [WISHLIST_KEY], onChange);
}

export function subscribeRecentlyViewed(onChange: () => void): () => void {
  return subscribe([RECENT_EVENT], [RECENT_KEY], onChange);
}

// --- wishlist ----------------------------------------------------------------

export function getWishlistSnapshot(): WishlistEntry[] {
  return wishlistsSnapshot();
}

export function inWishlistSnapshot(productId: string): boolean {
  return wishlistsSnapshot().some((e) => e.id === productId);
}

/** Add (or remove) a product; returns the new membership state. */
export function toggleWishlist(
  snapshot: Omit<WishlistEntry, "addedAt">,
): boolean {
  const current = wishlistsSnapshot();
  const existing = current.some((e) => e.id === snapshot.id);
  wishlistCache = existing
    ? current.filter((e) => e.id !== snapshot.id)
    : [{ ...snapshot, addedAt: new Date().toISOString() }, ...current];
  write(WISHLIST_KEY, wishlistCache);
  notify(WISHLIST_EVENT, WISHLIST_KEY);
  return !existing;
}

export function removeFromWishlist(productId: string): void {
  wishlistCache = wishlistsSnapshot().filter((e) => e.id !== productId);
  write(WISHLIST_KEY, wishlistCache);
  notify(WISHLIST_EVENT, WISHLIST_KEY);
}

// --- recently viewed -----------------------------------------------------------

export function getRecentlyViewedSnapshot(): RecentEntry[] {
  return recentSnapshot();
}

export function recordRecentlyViewed(entry: RecentEntry): void {
  recentCache = [
    entry,
    ...recentSnapshot().filter((e) => e.slug !== entry.slug),
  ].slice(0, RECENT_LIMIT);
  write(RECENT_KEY, recentCache);
  notify(RECENT_EVENT, RECENT_KEY);
}

export { EMPTY_WISHLIST, EMPTY_RECENT };
