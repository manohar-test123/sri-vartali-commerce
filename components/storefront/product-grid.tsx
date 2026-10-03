/**
 * Responsive card grid for every listing surface (§48 responsive design).
 * An empty catalog renders the shared empty state instead of a bare hole.
 */

import Link from "next/link";

import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-wine-900/20 px-6 py-16 text-center">
        <p className="font-serif text-xl text-wine-900">Nothing here yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-wine-900/60">
          No pieces match this view right now. Try clearing a filter, or
          browse everything in the shop.
        </p>
        <Link
          href="/shop"
          className="mt-5 inline-block rounded-full border border-gold-500 px-5 py-2 text-sm text-wine-900 transition-colors hover:bg-gold-100"
        >
          Browse all
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={i === 0} />
      ))}
    </div>
  );
}
