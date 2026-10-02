"use client";

/**
 * §13 product gallery: primary/model image first (MediaManager's primary +
 * position order is preserved by the query), thumbnail rail, keyboard
 * arrows, and the recommended editorial sequence the uploads define.
 */

import { useEffect, useState } from "react";

import type { ProductMediaRow } from "@/lib/catalog/types";

export function ProductGallery({
  media,
  productName,
}: {
  media: ProductMediaRow[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const current = media[Math.min(active, media.length - 1)];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setActive((i) => Math.min(i + 1, media.length - 1));
      } else if (event.key === "ArrowLeft") {
        setActive((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [media.length]);

  if (media.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-wine-900/5 text-sm text-wine-900/40">
        Photographs coming soon
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-wine-900/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt || productName}
          className="h-full w-full object-cover"
        />
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
              onClick={() => setActive(i)}
              className={`h-16 w-12 shrink-0 overflow-hidden rounded-md border transition-colors ${
                i === active ? "border-gold-500" : "border-wine-900/15 hover:border-wine-900/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-wine-900/40">
        Use ← → keys to browse photographs
      </p>
    </div>
  );
}
