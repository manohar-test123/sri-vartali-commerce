import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/storefront/add-to-cart";
import { ProductCard, cardDataFromSummary } from "@/components/storefront/product-card";
import { PinChecker } from "@/components/storefront/pin-checker";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { RecentlyViewed } from "@/components/storefront/recently-viewed";
import { WishlistToggle } from "@/components/storefront/wishlist-toggle";
import { discountPercent, formatPaise } from "@/lib/catalog/money";
import { effectiveSeo } from "@/lib/catalog/seo";
import type { AttributeValues } from "@/lib/catalog/types";
import {
  getPublishedProductBySlug,
  listPublishedProducts,
} from "@/lib/storefront/queries";

/**
 * /product/[slug] (§13). Anon-visible rows only — RLS hides drafts, so a
 * missing/slug-typo renders 404. Variant pick, Add to Cart and Buy Now
 * (§18/§19) live in AddToCart; totals are always server-verified (§22).
 */
export const dynamic = "force-dynamic";

function humanize(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Attribute rows excluding ones already shown as hero cues. */
function attributeRows(
  attributes: AttributeValues,
  skip: string[],
): Array<{ label: string; value: string }> {
  return Object.entries(attributes)
    .filter(([key, value]) => !skip.includes(key) && typeof value === "string" && value !== "")
    .map(([key, value]) => ({ label: humanize(key), value: String(value) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getPublishedProductBySlug(slug);
  if (!bundle) return { title: "Product not found · Sri Vartali" };
  // §15G: explicit owner override wins, else the auto-default — identical
  // to what the CMS preview shows.
  const seo = effectiveSeo({
    name: bundle.product.name,
    shortDescription: bundle.product.short_description,
    seoTitleOverride: bundle.product.seo_title,
    seoDescriptionOverride: bundle.product.seo_description,
  });
  return {
    title: seo.title,
    description: seo.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await getPublishedProductBySlug(slug);
  if (!bundle) notFound();

  const { product } = bundle;
  const discount = discountPercent(product.mrp_paise, product.selling_price_paise);
  const totalAvailable = bundle.variants.reduce((sum, v) => sum + v.available, 0);
  const soldOut = totalAvailable === 0;

  const allProducts = await listPublishedProducts();
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && p.categorySlug === bundle.categorySlug)
    .slice(0, 4);

  const attributes = (product.attributes ?? {}) as AttributeValues;
  const detailRows = attributeRows(attributes, ["color", "fabric", "material"]);
  const measurements = Object.entries(product.measurements ?? {}).filter(
    ([, v]) => v !== null && v !== "",
  );
  const priceRupees = (product.selling_price_paise / 100).toFixed(2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.product_code,
    description:
      product.short_description ?? product.description ?? product.name,
    image: bundle.media.map((m) => m.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: priceRupees,
      availability: soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        // Product structured data for search engines (§385 SEO direction)
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-wine-900/50">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-wine-900">Home</Link></li>
          <li aria-hidden>/</li>
          {bundle.categorySlug ? (
            <>
              <li>
                <Link
                  href={`/category/${bundle.categorySlug}`}
                  className="hover:text-wine-900"
                >
                  {bundle.categoryName}
                </Link>
              </li>
              <li aria-hidden>/</li>
            </>
          ) : null}
          <li aria-current="page" className="text-wine-900/80">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery media={bundle.media} productName={product.name} />

        <div>
          {bundle.parentCategoryName ? (
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
              {bundle.parentCategoryName}
              {bundle.categoryName && bundle.categoryName !== bundle.parentCategoryName
                ? ` · ${bundle.categoryName}`
                : ""}
            </p>
          ) : null}
          <h1 className="mt-1 font-serif text-3xl leading-tight text-wine-900">
            {product.name}
          </h1>
          <p className="mt-1 text-xs tracking-wide text-wine-900/50">
            {product.product_code}
          </p>

          {bundle.rating ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-wine-900/70">
              <span aria-hidden className="text-gold-600">
                {"★".repeat(Math.round(bundle.rating.average))}
                <span className="text-wine-900/20">
                  {"★".repeat(5 - Math.round(bundle.rating.average))}
                </span>
              </span>
              {bundle.rating.average.toFixed(1)} · {bundle.rating.count}{" "}
              {bundle.rating.count === 1 ? "review" : "reviews"}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-semibold text-wine-900">
              {formatPaise(product.selling_price_paise)}
            </span>
            {product.mrp_paise !== null && discount !== null && discount > 0 ? (
              <>
                <span className="text-base text-wine-900/50 line-through">
                  {formatPaise(product.mrp_paise)}
                </span>
                <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-wine-900">
                  {discount}% off
                </span>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-wine-900/40">
            Inclusive of all taxes
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-wine-900/70">
            {typeof attributes.color === "string" ? (
              <span>
                Colour: <strong className="font-medium text-wine-900">{attributes.color}</strong>
              </span>
            ) : null}
            {typeof attributes.fabric === "string" || typeof attributes.material === "string" ? (
              <span>
                Fabric:{" "}
                <strong className="font-medium text-wine-900">
                  {(typeof attributes.fabric === "string" && attributes.fabric) ||
                    attributes.material}
                </strong>
              </span>
            ) : null}
          </div>

          {/* §12/§13 stock states */}
          <p className="mt-3 text-sm">
            {soldOut ? (
              <span className="inline-block rounded-full bg-wine-900/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-wine-900/60">
                Sold out
              </span>
            ) : (
              <span className="text-wine-900/70">
                In stock
                {totalAvailable <= 3 ? (
                  <span className="ml-1 font-semibold text-red-700">
                    · only {totalAvailable} left
                  </span>
                ) : null}
              </span>
            )}
          </p>

          {bundle.variants.length > 1 ? (
            <p className="mt-5 text-xs text-wine-900/50">
              Multiple options available — pick yours below the price.
            </p>
          ) : null}

          {bundle.variants.length > 0 ? (
            <AddToCart
              variants={bundle.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                name: v.name,
                priceLabel: formatPaise(v.pricePaise),
                available: v.available,
              }))}
            />
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <WishlistToggle
              size="lg"
              snapshot={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                productCode: product.product_code,
                categoryName: bundle.categoryName,
                pricePaise: product.selling_price_paise,
                imageUrl: bundle.media[0]?.url ?? null,
                imageAlt: bundle.media[0]?.alt || product.name,
              }}
            />
            <p className="text-xs leading-5 text-wine-900/50">
              Save to wishlist, or order straight from here —
              <br />
              every listing names its fabric and measurements.
            </p>
          </div>

          <div className="mt-5">
            <PinChecker dispatchTimeDays={product.dispatch_time_days} />
          </div>

          {product.short_description ? (
            <p className="mt-6 border-l-2 border-gold-300 pl-4 font-serif text-base italic leading-7 text-wine-900/80">
              {product.short_description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Description */}
      {product.description ? (
        <section aria-label="Description" className="mt-14 border-t border-wine-900/10 pt-8">
          <h2 className="font-serif text-2xl text-wine-900">Description</h2>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-wine-900/80">
            {product.description}
          </p>
        </section>
      ) : null}

      {/* Attributes */}
      {detailRows.length > 0 ? (
        <section aria-label="Attributes" className="mt-12 border-t border-wine-900/10 pt-8">
          <h2 className="font-serif text-2xl text-wine-900">Details</h2>
          <dl className="mt-4 grid max-w-3xl grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
            {detailRows.map((row) => (
              <div key={row.label} className="flex gap-3 border-b border-wine-900/5 pb-1.5 text-sm">
                <dt className="w-36 shrink-0 text-wine-900/50">{row.label}</dt>
                <dd className="text-wine-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Measurements */}
      {measurements.length > 0 ? (
        <section aria-label="Measurements" className="mt-12 border-t border-wine-900/10 pt-8">
          <h2 className="font-serif text-2xl text-wine-900">Measurements</h2>
          <dl className="mt-4 grid max-w-3xl grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
            {measurements.map(([key, value]) => (
              <div key={String(key)} className="flex gap-3 border-b border-wine-900/5 pb-1.5 text-sm">
                <dt className="w-36 shrink-0 text-wine-900/50">{humanize(String(key))}</dt>
                <dd className="text-wine-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Care */}
      {product.care_instructions || typeof attributes.care_instructions === "string" ? (
        <section aria-label="Care" className="mt-12 border-t border-wine-900/10 pt-8">
          <h2 className="font-serif text-2xl text-wine-900">Care</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-wine-900/80">
            {product.care_instructions ?? attributes.care_instructions}
          </p>
        </section>
      ) : null}

      {/* Shipping & returns */}
      <section aria-label="Shipping and returns" className="mt-12 border-t border-wine-900/10 pt-8">
        <h2 className="font-serif text-2xl text-wine-900">Shipping &amp; returns</h2>
        <dl className="mt-4 max-w-3xl space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 text-wine-900/50">Dispatch</dt>
            <dd className="text-wine-900">
              Within {product.dispatch_time_days}{" "}
              {product.dispatch_time_days === 1 ? "day" : "days"} of order
              confirmation
            </dd>
          </div>
          {product.weight_g !== null ? (
            <div className="flex gap-3">
              <dt className="w-40 shrink-0 text-wine-900/50">Weight</dt>
              <dd className="text-wine-900">{product.weight_g} g</dd>
            </div>
          ) : null}
          {product.shipping_notes ? (
            <div className="flex gap-3">
              <dt className="w-40 shrink-0 text-wine-900/50">Notes</dt>
              <dd className="text-wine-900">{product.shipping_notes}</dd>
            </div>
          ) : null}
          <div className="flex gap-3">
            <dt className="w-40 shrink-0 text-wine-900/50">Returns</dt>
            <dd className="text-wine-900">
              {product.return_eligible
                ? "Eligible for return — exact window confirmed at checkout."
                : "This piece is final sale (made to order)."}
            </dd>
          </div>
        </dl>
      </section>

      {/* Reviews */}
      <section aria-label="Reviews" className="mt-12 border-t border-wine-900/10 pt-8">
        <h2 className="font-serif text-2xl text-wine-900">Reviews</h2>
        {bundle.reviews.length === 0 ? (
          <p className="mt-3 text-sm text-wine-900/60">
            No reviews yet. Verified-buyer reviews open with ordering.
          </p>
        ) : (
          <ul className="mt-5 grid gap-6 sm:grid-cols-2">
            {bundle.reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-wine-900/10 bg-white/60 p-4">
                <p className="flex items-center gap-2 text-sm text-wine-900">
                  <span aria-hidden className="text-gold-600">
                    {"★".repeat(r.rating)}
                  </span>
                  {r.title ? <strong className="font-medium">{r.title}</strong> : null}
                </p>
                {r.body ? (
                  <p className="mt-1.5 text-sm leading-6 text-wine-900/75">{r.body}</p>
                ) : null}
                <p className="mt-2 text-[11px] text-wine-900/40">
                  {r.customerName ?? "Verified buyer"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Related */}
      {relatedProducts.length > 0 ? (
        <section aria-label="Related products" className="mt-12 border-t border-wine-900/10 pt-8">
          <h2 className="font-serif text-2xl text-wine-900">You may also like</h2>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={cardDataFromSummary(p)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Recently viewed */}
      <div className="mt-12">
        <RecentlyViewed
          current={{
            slug: product.slug,
            name: product.name,
            productCode: product.product_code,
            imageUrl: bundle.media[0]?.url ?? null,
            pricePaise: product.selling_price_paise,
          }}
        />
      </div>
    </div>
  );
}
