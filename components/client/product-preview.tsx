"use client";

import { useEffect, useState } from "react";

import { discountPercent, formatPaise } from "@/lib/catalog/money";
import { effectiveSeo } from "@/lib/catalog/seo";
import type { ProductMediaRow, ProductStatus } from "@/lib/catalog/types";

/**
 * Product preview (§15H [ PREVIEW ]): how the product will look on the
 * public store (§13 sections that exist today), rendered from the live
 * wizard state — nothing here is persisted. The SEO snippet shows the
 * §15G auto-generated metadata an override replaces.
 */

export type PreviewData = {
  name: string;
  productCode: string | null;
  status: ProductStatus;
  shortDescription: string;
  description: string;
  sellingPricePaise: number | null;
  mrpPaise: number | null;
  attributes: Array<{ label: string; value: string }>;
  media: ProductMediaRow[];
  stock: number | null;
  lowStock: boolean;
  seoTitleOverride: string;
  seoDescriptionOverride: string;
};

export function ProductPreview({
  data,
  onClose,
}: {
  data: PreviewData;
  onClose: () => void;
}) {
  const ordered = [...data.media].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
  );
  const [active, setActive] = useState(0);
  const activeImage = ordered[Math.min(active, ordered.length - 1)];

  const discount =
    data.mrpPaise !== null && data.sellingPricePaise !== null
      ? discountPercent(data.mrpPaise, data.sellingPricePaise)
      : null;
  const seo = effectiveSeo({
    name: data.name,
    shortDescription: data.shortDescription,
    seoTitleOverride: data.seoTitleOverride,
    seoDescriptionOverride: data.seoDescriptionOverride,
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-wine-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Product preview"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-ivory-50 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
            Preview · how customers will see it
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-wine-900/20 px-3 py-1 text-xs text-wine-900/70 hover:border-gold-500"
          >
            Close (esc)
          </button>
        </div>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {/* §13 gallery */}
          <div>
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-wine-900/5">
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImage.url}
                  alt={activeImage.alt ?? data.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-wine-900/40">
                  No photos yet
                </div>
              )}
            </div>
            {ordered.length > 1 ? (
              <div className="mt-2 flex gap-2">
                {ordered.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`h-14 w-11 overflow-hidden rounded-md border ${
                      m === activeImage ? "border-gold-500" : "border-wine-900/15"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* §13 details */}
          <div>
            <h2 className="font-serif text-2xl text-wine-900">
              {data.name.trim() === "" ? "Untitled product" : data.name}
            </h2>
            <p className="mt-1 text-xs text-wine-900/50">
              {data.productCode ?? "ID assigned on first save"} · {data.status}
            </p>

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="text-xl font-semibold text-wine-900">
                {data.sellingPricePaise !== null ? formatPaise(data.sellingPricePaise) : "₹ —"}
              </span>
              {data.mrpPaise !== null && discount !== null && discount > 0 ? (
                <>
                  <span className="text-sm text-wine-900/50 line-through">
                    {formatPaise(data.mrpPaise)}
                  </span>
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-wine-900">
                    {discount}% off
                  </span>
                </>
              ) : null}
            </div>

            {/* §12 stock states */}
            {data.stock === null ? (
              <p className="mt-2 text-xs text-wine-900/50">
                Stock unlocks once the draft exists.
              </p>
            ) : data.stock === 0 ? (
              <p className="mt-2 inline-block rounded-full bg-wine-900/10 px-2.5 py-0.5 text-[11px] font-semibold text-wine-900/60">
                SOLD OUT
              </p>
            ) : (
              <p className="mt-2 text-xs text-wine-900/60">
                In stock: {data.stock}
                {data.lowStock ? (
                  <span className="ml-1 font-semibold text-red-700">· low stock</span>
                ) : null}
              </p>
            )}

            {data.attributes.length > 0 ? (
              <dl className="mt-4 space-y-1.5 text-sm">
                {data.attributes.map((a) => (
                  <div key={a.label} className="flex gap-2">
                    <dt className="w-32 shrink-0 text-wine-900/60">{a.label}</dt>
                    <dd className="text-wine-900">{a.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {data.shortDescription.trim() !== "" ? (
              <p className="mt-4 text-sm italic text-wine-900/70">
                {data.shortDescription}
              </p>
            ) : null}
          </div>
        </div>

        {data.description.trim() !== "" ? (
          <div className="mt-5 border-t border-wine-900/10 pt-4">
            <h3 className="font-serif text-lg text-wine-900">Description</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-wine-900/80">
              {data.description}
            </p>
          </div>
        ) : null}

        {/* §15G — effective metadata as a search snippet */}
        <div className="mt-5 border-t border-wine-900/10 pt-4">
          <h3 className="font-serif text-lg text-wine-900">Search listing</h3>
          <div className="mt-2 rounded-xl bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-wine-900/40">
              sri-vartali-commerce.vercel.app
            </p>
            <p className="mt-0.5 text-[15px] text-indigo-800">{seo.title}</p>
            <p className="text-xs leading-snug text-wine-900/60">{seo.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
