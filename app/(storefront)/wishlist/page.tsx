"use client";

/**
 * /wishlist (§7): the guest wishlist from localStorage (see
 * lib/storefront/browser-storage for why it is browser-local in v1).
 * Client page — content appears after mount; SSR renders the shell.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { formatPaise } from "@/lib/catalog/money";
import {
  getWishlist,
  onWishlistChange,
  removeFromWishlist,
  type WishlistEntry,
} from "@/lib/storefront/browser-storage";

export default function WishlistPage() {
  const [entries, setEntries] = useState<WishlistEntry[] | null>(null);

  useEffect(() => {
    const sync = () => setEntries(getWishlist());
    sync();
    return onWishlistChange(sync);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
          Saved for later
        </p>
        <h1 className="mt-1 font-serif text-3xl text-wine-900">Your wishlist</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-wine-900/60">
          Hearts you tap are saved in this browser. When customer accounts
          open with checkout, this list will follow you across devices.
        </p>
      </header>

      {entries === null ? null : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-wine-900/20 px-6 py-16 text-center">
          <p className="font-serif text-xl text-wine-900">Nothing saved yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-wine-900/60">
            Tap the heart on any piece to keep it here while you browse.
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-block rounded-full border border-gold-500 px-5 py-2 text-sm hover:bg-gold-100"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map((e) => (
            <li key={e.id} className="group relative flex flex-col">
              <Link
                href={`/product/${e.slug}`}
                className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-wine-900/5"
              >
                {e.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.imageUrl}
                    alt={e.imageAlt || e.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-wine-900/40">
                    Coming soon
                  </span>
                )}
              </Link>
              <div className="mt-2.5">
                {e.categoryName ? (
                  <p className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
                    {e.categoryName}
                  </p>
                ) : null}
                <h2 className="text-sm font-medium leading-snug text-wine-900">
                  <Link href={`/product/${e.slug}`} className="hover:underline">
                    {e.name}
                  </Link>
                </h2>
                <p className="mt-0.5 text-sm text-wine-900/70">
                  {formatPaise(e.pricePaise)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFromWishlist(e.id)}
                className="absolute right-2 top-2 rounded-full border border-wine-900/15 bg-ivory-50/90 px-2.5 py-1 text-[11px] text-wine-900/70 backdrop-blur-sm transition-colors hover:border-wine-700 hover:text-wine-900"
              >
                Remove ♥
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
