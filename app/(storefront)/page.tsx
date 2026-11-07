import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard, cardDataFromSummary } from "@/components/storefront/product-card";
import { formatPaise } from "@/lib/catalog/money";
import {
  listPublishedProducts,
  listStorefrontCollections,
} from "@/lib/storefront/queries";
import { distinctAttributeValues } from "@/lib/storefront/search";

/**
 * Homepage (§11). Sections render only when live data backs them:
 * collections, new arrivals, fabric/occasion rails and a featured edit come
 * from the catalog; Best Sellers wait for order history (Phase 6+) and
 * reviews/WhatsApp/newsletter wait for their data sources — an honest home
 * page beats placeholder theatre.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sri Vartali Sarees · Handpicked ethnic wear",
  description:
    "Handpicked Kanjivaram silks, cottons and occasion wear, curated slowly and photographed honestly. Shop sarees, dresses and kurtis at Sri Vartali.",
};

function SectionHeading({
  kicker,
  title,
  href,
  linkLabel,
}: {
  kicker?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {kicker ? (
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
            {kicker}
          </p>
        ) : null}
        <h2 className="mt-1 font-serif text-2xl text-wine-900 sm:text-3xl">
          {title}
        </h2>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="shrink-0 border-b border-gold-500 pb-0.5 text-sm text-wine-900/80 hover:text-wine-900"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const [products, collections] = await Promise.all([
    listPublishedProducts(),
    listStorefrontCollections(),
  ]);

  const newArrivals = products.slice(0, 8);
  const featured =
    collections.find((c) => c.productCount > 0) ?? null;
  const fabrics = distinctAttributeValues(products, ["fabric", "material"]).slice(0, 8);
  const occasions = distinctAttributeValues(products, ["occasion"]).slice(0, 6);

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="border-b border-wine-900/10 bg-gradient-to-b from-wine-50 to-ivory-100">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-600">
            Sri Vartali Sarees
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-wine-900 sm:text-6xl">
            Timeless weaves, crafted for celebration
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-wine-900/70">
            Handpicked Kanjivaram silks, breathable cottons and occasion wear —
            each piece chosen slowly, described honestly, photographed as it is.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-wine-900 px-7 py-3 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-800"
            >
              Shop the collection
            </Link>
            <Link
              href="/new-arrivals"
              className="rounded-full border border-gold-500 px-7 py-3 text-sm text-wine-900 transition-colors hover:bg-gold-100"
            >
              New arrivals
            </Link>
          </div>
        </div>
      </section>

      {/* Shop by Collection (§41) */}
      {collections.length > 0 ? (
        <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6">
          <SectionHeading
            kicker="Curated edits"
            title="Shop by collection"
          />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {collections.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="flex h-28 flex-col items-center justify-center rounded-2xl border border-gold-200 bg-white/70 px-4 text-center transition-colors hover:border-gold-400 hover:bg-white"
                >
                  <span className="font-serif text-lg text-wine-900">{c.name}</span>
                  <span className="mt-1 text-xs text-wine-900/50">
                    {c.productCount} {c.productCount === 1 ? "piece" : "pieces"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* New Arrivals */}
      {newArrivals.length > 0 ? (
        <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6">
          <SectionHeading
            kicker="Fresh in"
            title="New arrivals"
            href="/new-arrivals"
            linkLabel="See all"
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((p, i) => (
              <ProductCard
                key={p.id}
                product={cardDataFromSummary(p)}
                eager={i === 0}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-[1440px] px-4 py-20 text-center sm:px-6">
          <p className="font-serif text-2xl text-wine-900">The atelier is stocking</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-wine-900/60">
            The first pieces are being photographed and priced. Join the shop
            soon — or watch new arrivals as they land.
          </p>
        </section>
      )}

      {/* Brand story — owner's own words; founder portrait left (Phase 26) */}
      <section className="border-y border-wine-900/10 bg-wine-900 text-ivory-100">
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-10 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:gap-14">
          {/* Founder portrait — square crop via aspect-ratio + object-cover,
              so any photograph placed at /brand/founder.jpg renders cleanly
              (swap the src + alt when the owner's photograph lands). */}
          <figure className="mx-auto w-full max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/founder-placeholder.svg"
              alt="Portrait of the founder of Sri Vartali"
              width={480}
              height={480}
              className="aspect-square w-full rounded-2xl border border-gold-300/40 object-cover shadow-2xl shadow-black/30"
            />
            <figcaption className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-gold-300/80">
              The founder
            </figcaption>
          </figure>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-300">
              Our story
            </p>
            <h2 className="mt-2 font-serif text-3xl">One saree at a time</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-ivory-100/80">
              <p>
                Sri Vartali was born out of my love for sarees and the happiness
                I find in wearing them every single day. What started as a
                personal passion slowly grew into a dream of creating something
                of my own.
              </p>
              <p>
                I always wished to bring together sarees that reflect my taste,
                my choices, and the beauty I see in every weave. My biggest
                dream is to have people fall in love with the collections I
                handpick, just as much as I do.
              </p>
              <p>
                Sri Vartali is more than just a saree business; it&rsquo;s my
                little world, a piece of my heart, and a dream I&rsquo;m
                bringing to life, one saree at a time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Fabric */}
      {fabrics.length > 0 ? (
        <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6">
          <SectionHeading kicker="By material" title="Shop by fabric" />
          <ul className="flex flex-wrap gap-3">
            {fabrics.map((f) => (
              <li key={f}>
                <Link
                  href={`/shop?fabric=${encodeURIComponent(f)}`}
                  className="inline-block rounded-full border border-wine-900/15 bg-white/70 px-5 py-2 text-sm text-wine-900/80 transition-colors hover:border-gold-400 hover:text-wine-900"
                >
                  {f}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Shop by Occasion */}
      {occasions.length > 0 ? (
        <section className="mx-auto w-full max-w-[1440px] px-4 pb-14 sm:px-6">
          <SectionHeading kicker="Dress for it" title="Shop by occasion" />
          <ul className="flex flex-wrap gap-3">
            {occasions.map((o) => (
              <li key={o}>
                <Link
                  href={`/shop?occasion=${encodeURIComponent(o)}`}
                  className="inline-block rounded-full border border-wine-900/15 bg-white/70 px-5 py-2 text-sm text-wine-900/80 transition-colors hover:border-gold-400 hover:text-wine-900"
                >
                  {o}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Featured Collection */}
      {featured ? (
        <section className="border-t border-wine-900/10 bg-ivory-50">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6">
            <SectionHeading
              kicker="Featured edit"
              title={featured.name}
              href={`/collections/${featured.slug}`}
              linkLabel="View the edit"
            />
            {featured.description ? (
              <p className="mb-6 max-w-2xl text-sm leading-7 text-wine-900/70">
                {featured.description}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {products
                .filter((p) => p.collectionSlugs.includes(featured.slug))
                .slice(0, 4)
                .map((p) => (
                  <ProductCard key={p.id} product={cardDataFromSummary(p)} />
                ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Concierge strip */}
      <section className="mx-auto w-full max-w-[1440px] px-4 py-14 text-center sm:px-6">
        <p className="font-serif text-2xl text-wine-900">Not sure what to choose?</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-wine-900/60">
          Every listing names its fabric, weave and measurements — from{" "}
          {products.length > 0 ? formatPaise(Math.min(...products.map((p) => p.pricePaise))) : "₹—"}
          {" "}upwards. Filter by colour, fabric or occasion and shortlist with the
          heart; we open ordering next.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-wine-900 px-7 py-3 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-800"
        >
          Start browsing
        </Link>
      </section>
    </div>
  );
}
