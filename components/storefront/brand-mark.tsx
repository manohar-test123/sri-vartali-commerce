import {
  BRAND_LOGO_ALT,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_SRC,
  BRAND_LOGO_WIDTH,
} from "@/lib/storefront/brand";

/**
 * The official company logo (Phase 21): the gold-framed lockup — peacock
 * saree emblem above the "Sri Vartali Sarees" wordmark + Telugu tagline.
 * Rendered as an aspect-correct <img>; a plain server component (no hooks)
 * usable from any layout, page, or client tree.
 */
export function BrandMark({
  height,
  className,
}: {
  height: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_LOGO_ALT}
      width={Math.round((height * BRAND_LOGO_WIDTH) / BRAND_LOGO_HEIGHT)}
      height={height}
      className={className}
    />
  );
}
