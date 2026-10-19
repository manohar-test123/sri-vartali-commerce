import { describe, expect, it } from "vitest";

import {
  SPLASH_DURATION_MS,
  SPLASH_FADE_MS,
  SPLASH_STORAGE_KEY,
  shouldShowSplash,
  splashRedirectPath,
} from "@/lib/storefront/splash";

describe("shouldShowSplash (Phase 20 entry decision)", () => {
  it("shows on a session's first entry", () => {
    expect(
      shouldShowSplash({ alreadyShown: false, prefersReducedMotion: false }),
    ).toBe(true);
  });

  it("never replays within the same browser session", () => {
    expect(
      shouldShowSplash({ alreadyShown: true, prefersReducedMotion: false }),
    ).toBe(false);
  });

  it("never shows for reduced-motion users", () => {
    expect(
      shouldShowSplash({ alreadyShown: false, prefersReducedMotion: true }),
    ).toBe(false);
  });
});

describe("splashRedirectPath (land on the homepage)", () => {
  it("stays put when already on the homepage", () => {
    expect(splashRedirectPath("/")).toBeNull();
  });

  it("redirects any other entry page to the homepage (per spec)", () => {
    expect(splashRedirectPath("/shop")).toBe("/");
    expect(splashRedirectPath("/product/wine-silk-saree")).toBe("/");
  });
});

describe("splash timing constants", () => {
  it("holds the medallion for 2 seconds, then fades for under a second", () => {
    expect(SPLASH_DURATION_MS).toBe(2000);
    expect(SPLASH_FADE_MS).toBeGreaterThan(0);
    expect(SPLASH_FADE_MS).toBeLessThan(1000);
  });

  it("uses a stable sessionStorage key", () => {
    expect(SPLASH_STORAGE_KEY).toBe("sv-splash-played");
  });
});
