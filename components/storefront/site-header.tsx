/**
 * Storefront header (§10-§11, Phase 22): one horizontal row on desktop —
 * brand lockup · category links · search / wishlist / account / cart icons,
 * evenly spaced and vertically aligned. Below lg the same two elements
 * stack (brand + icon row, then the wrapped centered link rail) using one
 * flex-wrap container, so no markup is duplicated. The rail lists only
 * categories the launch store sells (navVisibleCategories — Phase 19) and
 * keeps its active-route highlighting; the account action moved from the
 * rail into the icon row (person glyph → /account).
 */

import Link from "next/link";

import { BrandMark } from "@/components/storefront/brand-mark";
import { HeaderNav } from "@/components/storefront/header-nav";
import { BagIcon, PersonIcon, SearchIcon } from "@/components/storefront/icons";
import { WishlistBadge } from "@/components/storefront/wishlist-badge";
import { navVisibleCategories } from "@/lib/storefront/queries";
import type { CategoryNode } from "@/lib/storefront/search";

export function SiteHeader({
  categories,
  cartCount = 0,
}: {
  categories: CategoryNode[];
  /** Total units in the server-side cart; fetched by the layout. */
  cartCount?: number;
}) {
  const top = navVisibleCategories(categories);

  return (
    <header className="sticky top-0 z-40 border-b border-wine-900/10 bg-ivory-50/95 backdrop-blur">
      <p className="bg-wine-900 py-1.5 text-center text-[11px] tracking-[0.18em] text-ivory-100">
        HANDPICKED ETHNIC WEAR · CRAFTED FOR CELEBRATION
      </p>
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Sri Vartali — home"
        >
          {/* Phase 21 official lockup — it carries the wordmark itself, so
              no separate site-name span beside it. */}
          <BrandMark className="h-10 w-auto rounded-lg sm:h-11" height={44} />
        </Link>

        {/* Same nav markup at every width: inline centered row on lg+,
            wrapped centered rail on its own line below lg. */}
        <HeaderNav
          className="order-last basis-full lg:order-none lg:basis-auto lg:flex-1"
          items={[
            { href: "/shop", label: "Shop all" },
            ...top.map((c) => ({
              href: `/category/${c.slug}`,
              label: c.name,
            })),
            { href: "/new-arrivals", label: "New arrivals" },
          ]}
        />

        {/* Action icons — one family, one size, right-aligned end of the
            row: search · wishlist · account · cart. */}
        <nav
          aria-label="Store actions"
          className="ml-auto flex shrink-0 items-center gap-3 text-wine-900/70 sm:gap-4"
        >
          <Link
            href="/search"
            aria-label="Search"
            title="Search"
            className="rounded-full p-1 transition-colors hover:text-wine-900"
          >
            <SearchIcon className="h-[22px] w-[22px]" />
          </Link>
          <WishlistBadge />
          <Link
            href="/account"
            aria-label="Account"
            title="Account"
            className="rounded-full p-1 transition-colors hover:text-wine-900"
          >
            <PersonIcon className="h-[22px] w-[22px]" />
          </Link>
          <Link
            href="/cart"
            aria-label={`Cart${cartCount > 0 ? ` (${cartCount} items)` : ""}`}
            title="Cart"
            className="relative rounded-full p-1 transition-colors hover:text-wine-900"
          >
            <BagIcon className="h-[22px] w-[22px]" />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-wine-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ivory-50">
                {cartCount}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
