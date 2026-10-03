import type { ReactNode } from "react";
import Link from "next/link";

import { SiteHeader } from "@/components/storefront/site-header";
import { getCartCount } from "@/lib/cart/queries";
import { listStorefrontCategories } from "@/lib/storefront/queries";

/**
 * Storefront shell (§7 public routes): header with live category rail,
 * search, cart badge and wishlist; footer keeps only links that resolve
 * today — info pages (/about, /contact, …) land with their content in a
 * later phase.
 */

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  let categories: Awaited<ReturnType<typeof listStorefrontCategories>> = [];
  try {
    categories = await listStorefrontCategories();
  } catch {
    // Supabase not configured (e.g. CI build): render the shell unpopulated.
  }

  let cartCount = 0;
  try {
    cartCount = await getCartCount();
  } catch {
    // Same CI-build fallback as above.
  }

  return (
    <>
      {/* §49 keyboard navigation: first Tab stop, hidden until focused. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-wine-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ivory-50"
      >
        Skip to content
      </a>
      <SiteHeader categories={categories} cartCount={cartCount} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        {children}
      </main>
      <footer className="border-t border-wine-900/10 bg-ivory-50">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-serif text-xl text-wine-900">Sri Vartali</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-wine-900/60">
              Handpicked sarees and ethnic wear, curated for celebration.
              Every piece is chosen slowly and photographed honestly.
            </p>
          </div>
          <nav aria-label="Shop" className="text-sm">
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              Shop
            </p>
            <ul className="space-y-1.5 text-wine-900/70">
              <li><Link href="/shop" className="hover:underline">All pieces</Link></li>
              <li><Link href="/new-arrivals" className="hover:underline">New arrivals</Link></li>
              {categories
                .filter((c) => c.parentId === null)
                .slice(0, 4)
                .map((c) => (
                  <li key={c.id}>
                    <Link href={`/category/${c.slug}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
          <nav aria-label="Account" className="text-sm">
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              For you
            </p>
            <ul className="space-y-1.5 text-wine-900/70">
              <li><Link href="/wishlist" className="hover:underline">Wishlist</Link></li>
              <li><Link href="/cart" className="hover:underline">Cart</Link></li>
              <li><Link href="/search" className="hover:underline">Search</Link></li>
              <li><Link href="/account/login" className="hover:underline">Staff sign-in</Link></li>
            </ul>
          </nav>
        </div>
        <p className="border-t border-wine-900/10 py-4 text-center text-xs tracking-wide text-wine-900/50">
          © {new Date().getFullYear()} Sri Vartali Sarees
        </p>
      </footer>
    </>
  );
}
