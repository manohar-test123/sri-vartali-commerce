import type { ReactNode } from "react";
import Link from "next/link";

import {
  ContactDock,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/storefront/contact-dock";
import { SiteHeader } from "@/components/storefront/site-header";
import { getCartCount } from "@/lib/cart/queries";
import { resolveStoreContact } from "@/lib/store/contact";
import { listStorefrontCategories } from "@/lib/storefront/queries";

/**
 * Storefront shell (§7 public routes): header with live category rail,
 * search, cart badge and wishlist; footer keeps only links that resolve
 * today — info pages (/about, /contact, …) land with their content in a
 * later phase. A persistent WhatsApp/phone contact dock rides along on
 * every page when the supplier number is configured.
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

  // Soft read: hides the dock + footer contacts when no number is set.
  const contact = await resolveStoreContact();

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
            {contact ? (
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <a
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 font-medium text-white transition hover:brightness-95"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
                <a
                  href={contact.phoneUrl}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-wine-900/20 px-4 py-2 font-medium text-wine-900 transition hover:border-wine-900/40"
                >
                  <PhoneIcon className="h-4 w-4" />
                  {contact.displayNumber}
                </a>
              </div>
            ) : null}
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
      {contact ? <ContactDock whatsappUrl={contact.whatsappUrl} phoneUrl={contact.phoneUrl} /> : null}
      {/* Clearance for the mobile contact bar so it never covers content. */}
      {contact ? <div aria-hidden className="h-12 sm:hidden" /> : null}
    </>
  );
}
