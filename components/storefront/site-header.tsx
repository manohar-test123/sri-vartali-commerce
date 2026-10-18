/**
 * Storefront header (§10-§11): announcement bar, logo + wordmark, search,
 * wishlist, cart badge and a category rail with active-route highlighting.
 * Server-rendered from live categories; the search input is a plain GET
 * form so it works without JavaScript.
 */

import Link from "next/link";

import { HeaderNav } from "@/components/storefront/header-nav";
import { WishlistBadge } from "@/components/storefront/wishlist-badge";
import type { CategoryNode } from "@/lib/storefront/search";

export function SiteHeader({
  categories,
  cartCount = 0,
}: {
  categories: CategoryNode[];
  /** Total units in the server-side cart; fetched by the layout. */
  cartCount?: number;
}) {
  const top = categories.filter((c) => c.parentId === null);

  return (
    <header className="sticky top-0 z-40 border-b border-wine-900/10 bg-ivory-50/95 backdrop-blur">
      <p className="bg-wine-900 py-1.5 text-center text-[11px] tracking-[0.18em] text-ivory-100">
        HANDPICKED ETHNIC WEAR · CRAFTED FOR CELEBRATION
      </p>
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Sri Vartali — home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.svg"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 rounded-xl sm:h-10 sm:w-10"
          />
          <span className="font-serif text-2xl tracking-wide text-wine-900">
            Sri Vartali
          </span>
        </Link>

        <form
          action="/search"
          method="get"
          role="search"
          className="hidden flex-1 max-w-md sm:block"
        >
          <label htmlFor="site-search" className="sr-only">
            Search the store
          </label>
          <input
            id="site-search"
            type="search"
            name="q"
            placeholder="Search sarees, dresses, colours…"
            className="w-full rounded-full border border-wine-900/15 bg-white px-4 py-2 text-sm text-wine-900 placeholder:text-wine-900/40 focus:border-gold-500 focus:outline-none"
          />
        </form>

        <nav aria-label="Store" className="flex items-center gap-4 text-sm">
          <Link
            href="/search"
            aria-label="Search"
            className="text-wine-900/70 transition-colors hover:text-wine-900 sm:hidden"
          >
            <span aria-hidden>🔍</span>
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 text-wine-900/70 transition-colors hover:text-wine-900"
          >
            <span aria-hidden>🛍</span>
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 ? (
              <span className="rounded-full bg-wine-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ivory-50">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <WishlistBadge />
        </nav>
      </div>

      <HeaderNav
        items={[
          { href: "/shop", label: "Shop all" },
          ...top.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
          { href: "/new-arrivals", label: "New arrivals" },
          { href: "/account", label: "Account" },
        ]}
      />
    </header>
  );
}
