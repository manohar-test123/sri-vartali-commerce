/**
 * Official company logo (Phase 21): the owner-provided gold-framed brand
 * lockup — peacock saree emblem above the "Sri Vartali Sarees" wordmark
 * and Telugu tagline on deep plum. Single source of truth for every
 * placement; the pixel dimensions mirror the processed asset so renders
 * stay aspect-correct and layout-stable.
 */

import path from "node:path";

export const BRAND_LOGO_SRC = "/brand/logo-official.jpg";
export const BRAND_LOGO_ALT = "Sri Vartali Sarees";
export const BRAND_LOGO_WIDTH = 1590;
export const BRAND_LOGO_HEIGHT = 898;

/** Repo-relative paths of the assets this module describes — tests guard
 *  their existence so a deleted/swapped logo fails CI, not the storefront. */
export function brandAssetPaths(repoRoot: string): string[] {
  return [
    path.join(repoRoot, "public", "brand", "logo-official.jpg"),
    path.join(repoRoot, "app", "icon.png"),
  ];
}
