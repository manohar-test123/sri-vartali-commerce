"use client";

/**
 * §13 "Recently viewed": records the current product once on mount and
 * renders the strip from the localStorage external store. Renders nothing
 * until entries exist, so pages stay clean for first-time visitors.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { formatPaise } from "@/lib/catalog/money";
import {
  EMPTY_RECENT,
  getRecentlyViewedSnapshot,
  recordRecentlyViewed,
  subscribeRecentlyViewed,
  type RecentEntry,
} from "@/lib/storefront/browser-storage";

export function RecentlyViewed({ current }: { current: RecentEntry }) {
  const all = useSyncExternalStore(
    subscribeRecentlyViewed,
    getRecentlyViewedSnapshot,
    () => EMPTY_RECENT,
  );

  // Pure side effect: record the visit; the store notification re-renders.
  useEffect(() => {
    recordRecentlyViewed(current);
  }, [current]);

  const entries = all.filter((e) => e.slug !== current.slug).slice(0, 4);
  if (entries.length === 0) return null;

  return (
    <section aria-label="Recently viewed" className="border-t border-wine-900/10 pt-6">
      <h2 className="font-serif text-lg text-wine-900">Recently viewed</h2>
      <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {entries.map((e) => (
          <li key={e.slug}>
            <Link href={`/product/${e.slug}`} className="group flex gap-3">
              <span className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-wine-900/5">
                {e.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm text-wine-900 group-hover:underline">
                  {e.name}
                </span>
                <span className="mt-0.5 block text-xs text-wine-900/60">
                  {formatPaise(e.pricePaise)}
                </span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-wine-900/40">
                  {e.productCode}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
