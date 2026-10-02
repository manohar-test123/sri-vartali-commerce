/**
 * Public product card (spec §12): primary image with secondary hover image,
 * name, category cue, color, price/MRP/discount, rating, wishlist heart,
 * New badge, low-stock and sold-out states. Presentational — usable from
 * server pages and the client wishlist page alike.
 */

import Link from "next/link";

import { WishlistToggle } from "@/components/storefront/wishlist-toggle";
import { discountPercent, formatPaise } from "@/lib/catalog/money";
import type { Availability } from "@/lib/catalog/types";
import type { StoreProductSummary } from "@/lib/storefront/types";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  productCode: string;
  categoryName: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  hoverImageUrl: string | null;
  colorLabel: string | null;
  materialLabel: string | null;
  availability: Availability;
  lowStock: boolean;
  isNew: boolean;
  rating: { average: number; count: number } | null;
}

export function cardDataFromSummary(p: StoreProductSummary): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    productCode: p.productCode,
    categoryName: p.categoryParentName ?? p.categoryName,
    pricePaise: p.pricePaise,
    mrpPaise: p.mrpPaise,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt || p.name,
    hoverImageUrl: p.images[1]?.url ?? null,
    colorLabel: p.colorLabel,
    materialLabel: p.materialLabel,
    availability: p.availability,
    lowStock: p.lowStock,
    isNew: p.isNew,
    rating: p.rating,
  };
}

function Stars({ average }: { average: number }) {
  return (
    <span aria-hidden className="text-xs tracking-tight text-gold-600">
      {"★".repeat(Math.round(average))}
      <span className="text-wine-900/20">{"★".repeat(5 - Math.round(average))}</span>
    </span>
  );
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const discount = discountPercent(product.mrpPaise, product.pricePaise);
  const soldOut = product.availability === "SOLD_OUT";

  return (
    <article className="group relative flex flex-col">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-wine-900/5"
        aria-label={product.name}
      >
        {product.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.imageAlt || product.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                product.hoverImageUrl ? "group-hover:opacity-0" : ""
              } ${soldOut ? "opacity-70 saturate-50" : ""}`}
            />
            {product.hoverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.hoverImageUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            ) : null}
          </>
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-wine-900/40">
            Coming soon
          </span>
        )}

        <span className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isNew ? (
            <span className="rounded-full bg-wine-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ivory-50">
              New
            </span>
          ) : null}
          {soldOut ? (
            <span className="rounded-full bg-wine-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ivory-50">
              Sold out
            </span>
          ) : product.lowStock ? (
            <span className="rounded-full bg-gold-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-wine-900">
              Low stock
            </span>
          ) : null}
        </span>
      </Link>

      <div className="absolute right-2 top-2">
        <WishlistToggle
          snapshot={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            productCode: product.productCode,
            categoryName: product.categoryName,
            pricePaise: product.pricePaise,
            imageUrl: product.imageUrl,
            imageAlt: product.imageAlt,
          }}
        />
      </div>

      <div className="mt-2.5 flex flex-1 flex-col gap-0.5">
        {product.categoryName ? (
          <p className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            {product.categoryName}
          </p>
        ) : null}
        <h3 className="text-sm font-medium leading-snug text-wine-900">
          <Link href={`/product/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-wine-900/50">
          {[product.colorLabel, product.materialLabel]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {product.rating ? (
          <p className="flex items-center gap-1 text-xs text-wine-900/60">
            <Stars average={product.rating.average} />
            {product.rating.average.toFixed(1)} ({product.rating.count})
          </p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-wine-900">
            {formatPaise(product.pricePaise)}
          </span>
          {product.mrpPaise !== null && discount !== null && discount > 0 ? (
            <>
              <span className="text-xs text-wine-900/50 line-through">
                {formatPaise(product.mrpPaise)}
              </span>
              <span className="text-xs font-semibold text-wine-700">
                {discount}% off
              </span>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
