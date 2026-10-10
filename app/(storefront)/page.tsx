import type { Metadata } from "next";
import Link from "next/link";

import { RoyalHero } from "@/components/storefront/royal-hero";
import { RoyalEditorialRibbon } from "@/components/storefront/royal-editorial-ribbon";
import { RoyalCuratedShowcase } from "@/components/storefront/royal-curated-showcase";
import { RoyalZariVault } from "@/components/storefront/royal-zari-vault";
import { RoyalConciergeSection } from "@/components/storefront/royal-concierge-section";
import { RoyalPatronChronicles } from "@/components/storefront/royal-patron-chronicles";
import { ProductCard, cardDataFromSummary } from "@/components/storefront/product-card";
import {
  listPublishedProducts,
  listStorefrontCollections,
} from "@/lib/storefront/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sri Vartali Sarees | Royal Couture Handlooms",
  description:
    "Pure mulberry silk handwoven on sacred pit looms with certified 24-karat gold tested zari by fourth-generation master karigars of Kanchipuram and Varanasi.",
};

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof listPublishedProducts>> = [];
  let collections: Awaited<ReturnType<typeof listStorefrontCollections>> = [];

  try {
    const res = await Promise.all([
      listPublishedProducts(),
      listStorefrontCollections(),
    ]);
    products = res[0];
    collections = res[1];
  } catch {
    // If database is not configured in offline/dev mode, continue with royal showcase
  }

  return (
    <div className="flex flex-1 flex-col w-full bg-surface">
      {/* 1. Regal Editorial Hero Campaign */}
      <RoyalHero />

      {/* 2. Editorial Separator Ribbon */}
      <RoyalEditorialRibbon />

      {/* 3. Curated Royal Weaves Showcase (Anthology) */}
      <RoyalCuratedShowcase />

      {/* Optional: Live Catalog Pieces if populated in database */}
      {products.length > 0 ? (
        <section className="w-full py-space-xl bg-surface-container-low/50 border-t border-outline-variant/20">
          <div className="max-w-7xl mx-auto px-gutter-mobile lg:px-gutter-desktop">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-secondary font-semibold">
                  Atelier Archive
                </p>
                <h2 className="font-headline-lg text-headline-lg text-primary font-medium tracking-tight mt-1">
                  Recent Looms &amp; New Arrivals
                </h2>
              </div>
              <Link
                href="/shop"
                className="font-label-caps text-label-caps uppercase tracking-wider text-primary hover:underline font-semibold"
              >
                View Full Catalog ({products.length} Pieces) →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-gutter-desktop">
              {products.slice(0, 4).map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={cardDataFromSummary(p)}
                  eager={i === 0}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 4. Brand Heritage & The Zari Purity Vault */}
      <RoyalZariVault />

      {/* 5. Bespoke Bridal Trousseau Concierge (VIP Banner) */}
      <RoyalConciergeSection />

      {/* 6. Royal Patrons & Testimonials Section with Trust Stamp Bar */}
      <RoyalPatronChronicles />
    </div>
  );
}
