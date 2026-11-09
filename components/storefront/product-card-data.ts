/**
 * ProductCardData + cardDataFromSummary (spec §12) — pure data mapping,
 * shared between server pages and the client ProductCard. Kept in a
 * separate module so the card's "use client" boundary doesn't make
 * these functions unusable from server components.
 */

import type { StoreProductSummary } from "@/lib/storefront/types";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  productCode: string;
  categoryName: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  imageUrls: string[];
  imageAlt: string | null;
  colorLabel: string | null;
  materialLabel: string | null;
  availability: import("@/lib/catalog/types").Availability;
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
    imageUrls: p.images.slice(0, 6).map((m) => m.url),
    imageAlt: p.images[0]?.alt || p.name,
    colorLabel: p.colorLabel,
    materialLabel: p.materialLabel,
    availability: p.availability,
    lowStock: p.lowStock,
    isNew: p.isNew,
    rating: p.rating,
  };
}
