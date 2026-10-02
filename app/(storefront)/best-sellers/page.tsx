import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard, cardDataFromSummary } from "@/components/storefront/product-card";
import {
  listPublishedProducts,
  listStorefrontCollections,
} from "@/lib/storefront/queries";

/**
 * /best-sellers (§7). v1 is the curated "best-sellers" collection, edited
 * by the owner from the CMS; once order history exists (Phase 6+) this page
 * switches to actual sales ranking. No collection yet → honest empty state.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Best sellers · Sri Vartali",
  description: "The pieces our customers reach for most at Sri Vartali.",
};

const CURATED_SLUG = "best-sellers";

export default async function BestSellersPage() {
  const [products, collections] = await Promise.all([
    listPublishedProducts(),
    listStorefrontCollections(),
  ]);

  const curated = collections.find((c) => c.slug === CURATED_SLUG);
  const items = curated
    ? products.filter((p) => p.collectionSlugs.includes(CURATED_SLUG))
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
          Loved most
        </p>
        <h1 className="mt-1 font-serif text-3xl text-wine-900">Best sellers</h1>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-wine-900/20 px-6 py-16 text-center">
          <p className="font-serif text-xl text-wine-900">
            The charts open with the first orders
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-wine-900/60">
            Best sellers are ranked by real orders once checkout goes live.
            Until then, browse what just arrived.
          </p>
          <Link
            href="/new-arrivals"
            className="mt-5 inline-block rounded-full border border-gold-500 px-5 py-2 text-sm hover:bg-gold-100"
          >
            See new arrivals
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={cardDataFromSummary(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
