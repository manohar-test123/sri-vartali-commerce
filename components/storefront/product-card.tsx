"use client";

/**
 * Public product card (spec §12; Phase 33 rework): image gallery with
 * pagination dots and swipe, smooth 200ms transitions, hover auto-advance,
 * wishlist toggle, badges. Client component — the data mapping lives in
 * product-card-data.ts (shared with server pages).
 */

import Link from "next/link";
import { useRef, useState } from "react";

import { WishlistToggle } from "@/components/storefront/wishlist-toggle";
import {
  optimizedImageUrl,
  responsiveImageSrcSet,
} from "@/lib/media/optimized-url";
import { discountPercent, formatPaise } from "@/lib/catalog/money";
import type { ProductCardData } from "@/components/storefront/product-card-data";

export { cardDataFromSummary } from "@/components/storefront/product-card-data";
export type { ProductCardData } from "@/components/storefront/product-card-data";

function Stars({ average }: { average: number }) {
  return (
    <span aria-hidden className="text-xs tracking-tight text-gold-600">
      {"★".repeat(Math.round(average))}
      <span className="text-wine-900/20">{"★".repeat(5 - Math.round(average))}</span>
    </span>
  );
}

const SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

export function ProductCard({
  product,
  eager = false,
}: {
  product: ProductCardData;
  eager?: boolean;
}) {
  const discount = discountPercent(product.mrpPaise, product.pricePaise);
  const soldOut = product.availability === "SOLD_OUT";
  const images = product.imageUrls;
  const hasGallery = images.length > 1;

  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Desktop hover: auto-advance through images every 1.2s (subtle preview)
  function onHoverStart() {
    if (!hasGallery) return;
    hoverTimer.current = setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, 1200);
  }

  function onHoverEnd() {
    if (hoverTimer.current) {
      clearInterval(hoverTimer.current);
      hoverTimer.current = null;
    }
    setActive(0); // snap back to primary
  }

  // Mobile swipe: track touch delta, threshold 40px
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null || !hasGallery) return;
    const delta = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) setActive((i) => Math.min(i + 1, images.length - 1));
    else setActive((i) => Math.max(i - 1, 0));
  }

  return (
    <article className="group relative flex flex-col">
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-xl bg-wine-900/5"
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* image stack — only the active one is visible (200ms fade) */}
        {images.map((url, i) => {
          const u = optimizedImageUrl(url, { width: 600 });
          if (!u) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${url}-${i}`}
              src={u}
              srcSet={responsiveImageSrcSet(url, [400, 600, 800]) ?? undefined}
              sizes={SIZES}
              alt={i === 0 ? product.imageAlt || product.name : ""}
              loading={i === 0 && eager ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ease-out ${
                i === active ? "opacity-100" : "opacity-0"
              } ${soldOut ? "saturate-50" : ""}`}
            />
          );
        })}

        {images.length === 0 ? (
          <span className="flex h-full items-center justify-center text-xs text-wine-900/40">
            Coming soon
          </span>
        ) : null}

        {/* product link — covers the image but not the dots */}
        <Link
          href={`/product/${product.slug}`}
          className="absolute inset-0 bottom-8"
          aria-label={product.name}
        />

        {/* pagination dots — visible when multiple images; clickable/tappable */}
        {hasGallery ? (
          <div
            className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5"
            role="tablist"
            aria-label={`${product.name} images`}
          >
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Image ${i + 1} of ${images.length}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActive(i);
                  if (hoverTimer.current) {
                    clearInterval(hoverTimer.current);
                    hoverTimer.current = null;
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === active
                    ? "w-4 bg-wine-900"
                    : "w-1.5 bg-wine-900/30 hover:bg-wine-900/60"
                }`}
              />
            ))}
          </div>
        ) : null}

        {/* badges */}
        <span className="absolute left-2 top-2 z-10 flex flex-col gap-1">
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
      </div>

      <div className="absolute right-2 top-2 z-10">
        <WishlistToggle
          snapshot={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            productCode: product.productCode,
            categoryName: product.categoryName,
            pricePaise: product.pricePaise,
            imageUrl: images[0] ?? null,
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
