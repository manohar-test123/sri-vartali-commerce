"use client";

/**
 * §13 product gallery: primary/model image first (MediaManager's primary +
 * position order is preserved by the query), swipeable main strip (§48 —
 * horizontal scroll-snap, one photograph per view, zero-JS swiping on
 * touch), thumbnail rail, keyboard arrows. Pinch-zoom stays native browser
 * zoom — no custom gesture handling to break.
 */

import { useEffect, useRef, useState } from "react";

import type { ProductMediaRow } from "@/lib/catalog/types";
import {
  optimizedImageUrl,
  responsiveImageSrcSet,
} from "@/lib/media/optimized-url";

const HERO_WIDTHS = [600, 900, 1100, 1400] as const;
const HERO_SIZES = "(min-width: 1024px) 50vw, 100vw";

export function ProductGallery({
  media,
  productName,
}: {
  media: ProductMediaRow[];
  productName: string;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Keyboard parity with swiping (§49 keyboard navigation).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const strip = stripRef.current;
      if (!strip) return;
      const next =
        event.key === "ArrowRight"
          ? Math.min(active + 1, media.length - 1)
          : Math.max(active - 1, 0);
      if (next === active) return;
      strip.scrollTo({ left: next * strip.clientWidth, behavior: "smooth" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, media.length]);

  function select(index: number) {
    const strip = stripRef.current;
    if (strip) {
      strip.scrollTo({ left: index * strip.clientWidth, behavior: "smooth" });
    } else {
      setActive(index);
    }
  }

  if (media.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-wine-900/5 text-sm text-wine-900/40">
        Photographs coming soon
      </div>
    );
  }

  return (
    <div>
      <div
        ref={stripRef}
        onScroll={(event) => {
          const strip = event.currentTarget;
          const index = Math.round(strip.scrollLeft / strip.clientWidth);
          if (index !== active) setActive(index);
        }}
        className="flex aspect-[3/4] snap-x snap-mandatory overflow-x-auto rounded-2xl bg-wine-900/5"
        aria-label="Product photographs"
      >
        {media.map((m, i) => (
          <div key={m.id} className="h-full w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={optimizedImageUrl(m.url, { width: 1100 }) ?? m.url}
              srcSet={responsiveImageSrcSet(m.url, HERO_WIDTHS) ?? undefined}
              sizes={HERO_SIZES}
              alt={m.alt || productName}
              fetchPriority={i === 0 ? "high" : undefined}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      {media.length > 1 ? (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Product photographs"
        >
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`View photograph ${i + 1} of ${media.length}`}
              onClick={() => select(i)}
              className={`h-16 w-12 shrink-0 overflow-hidden rounded-md border transition-colors ${
                i === active ? "border-gold-500" : "border-wine-900/15 hover:border-wine-900/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optimizedImageUrl(m.url, { width: 160 }) ?? m.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
      {media.length > 1 ? (
        <p className="mt-2 text-[11px] text-wine-900/40">
          Swipe, or use ← → keys, to browse photographs
        </p>
      ) : null}
    </div>
  );
}
