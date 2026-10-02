import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard, cardDataFromSummary } from "@/components/storefront/product-card";
import { listPublishedProducts } from "@/lib/storefront/queries";

/** /new-arrivals (§7): everything by published_at, newest first. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New arrivals · Sri Vartali",
  description: "The latest pieces at Sri Vartali, hot off the loom.",
};

export default async function NewArrivalsPage() {
  const products = await listPublishedProducts();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
          Fresh in
        </p>
        <h1 className="mt-1 font-serif text-3xl text-wine-900">New arrivals</h1>
        <p className="mt-2 text-sm text-wine-900/60">
          Every piece below was published recently — newest first.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-wine-900/20 px-6 py-16 text-center text-sm text-wine-900/60">
          Nothing published yet.{" "}
          <Link href="/" className="underline hover:text-wine-900">
            Back to the home page
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={cardDataFromSummary(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
