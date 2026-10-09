/**
 * Cloudinary delivery-URL transforms (spec §47 performance, Phase 11).
 *
 * Product images are served from res.cloudinary.com. Cloudinary can
 * re-derive the derivative on the URL itself — f_auto picks AVIF/WebP per
 * browser, q_auto right-sizes quality, w_ requests the width we actually
 * lay out — so the browser downloads a fraction of the bytes with zero
 * Vercel image-optimization quota use (Hobby plan). Non-Cloudinary URLs
 * (data:, local, future hosts) pass through untouched. Pure — unit-tested.
 */

const CLOUDINARY_HOST = "res.cloudinary.com";

export interface ImageTransform {
  /** Layout width in CSS pixels we ask the CDN to render. */
  width: number;
}

/** `/upload/…` → `/upload/f_auto,q_auto,w_<width>/…`; other URLs unchanged. */
export function optimizedImageUrl(
  url: string | null | undefined,
  { width }: ImageTransform,
): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url; // relative or data: — nothing to transform
  }
  if (parsed.host !== CLOUDINARY_HOST) return url;

  const marker = "/upload/";
  const uploadIndex = parsed.pathname.indexOf(marker);
  if (uploadIndex === -1) return url;

  // Preserve anything already in the delivery path (e.g. a version or an
  // existing transformation chain) — our flags are prepended so they win.
  const before = parsed.pathname.slice(0, uploadIndex + marker.length);
  const after = parsed.pathname.slice(uploadIndex + marker.length);
  if (after.startsWith(`f_auto,q_auto,w_${width}/`)) return url; // already applied
  parsed.pathname = `${before}f_auto,q_auto,w_${width}/${after}`;
  return parsed.toString();
}

/**
 * `srcset` candidates for one image across layout widths (§47 responsive
 * image sizes): `"<url w400> 400w, <url w600> 600w, …` for use with a
 * `sizes` attribute, so phones fetch a small derivative and desktops a
 * large one instead of everyone paying for the widest.
 *
 * Returns null when there is nothing to tailor (no image, or a host we
 * can't transform — a srcset of identical URLs would just waste header
 * bytes; the plain `src` already covers it).
 */
export function responsiveImageSrcSet(
  url: string | null | undefined,
  widths: readonly number[],
): string | null {
  if (!url || widths.length === 0) return null;

  const first = optimizedImageUrl(url, { width: widths[0] });
  if (first === null || first === url) return null; // not transformable

  return widths
    .map((w) => `${optimizedImageUrl(url, { width: w })} ${w}w`)
    .join(", ");
}
