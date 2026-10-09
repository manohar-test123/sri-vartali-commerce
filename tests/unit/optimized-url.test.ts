import { describe, expect, it } from "vitest";

import {
  optimizedImageUrl,
  responsiveImageSrcSet,
} from "@/lib/media/optimized-url";

const BASE = "https://res.cloudinary.com/demo/image/upload/v1690000000/svs/products/SVS-P-000001/front.jpg";

describe("optimizedImageUrl", () => {
  it("inserts f_auto,q_auto,w_ into a Cloudinary delivery URL", () => {
    expect(optimizedImageUrl(BASE, { width: 600 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600/v1690000000/svs/products/SVS-P-000001/front.jpg",
    );
  });

  it("prepends to an existing transformation chain without clobbering it", () => {
    const withTransform =
      "https://res.cloudinary.com/demo/image/upload/c_thumb,w_200/sample.jpg";
    expect(optimizedImageUrl(withTransform, { width: 160 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_160/c_thumb,w_200/sample.jpg",
    );
  });

  it("passes non-Cloudinary URLs through untouched", () => {
    const urls = [
      "https://example.com/image.jpg",
      "https://khuumibmulagqgdrrtih.supabase.co/storage/v1/object/public/media/a.jpg",
      "/static/local.jpg",
      "data:image/png;base64,AAAA",
    ];
    for (const url of urls) {
      expect(optimizedImageUrl(url, { width: 600 })).toBe(url);
    }
  });

  it("passes through null/undefined/empty and returns null", () => {
    expect(optimizedImageUrl(null, { width: 600 })).toBeNull();
    expect(optimizedImageUrl(undefined, { width: 600 })).toBeNull();
    expect(optimizedImageUrl("", { width: 600 })).toBeNull();
  });

  it("leaves Cloudinary URLs without an /upload/ segment alone", () => {
    const authed = "https://res.cloudinary.com/demo/image/authenticated/x.jpg";
    expect(optimizedImageUrl(authed, { width: 600 })).toBe(authed);
  });

  it("is idempotent for URLs it already transformed", () => {
    const once = optimizedImageUrl(BASE, { width: 600 })!;
    expect(optimizedImageUrl(once, { width: 600 })).toBe(once);
  });
});

describe("responsiveImageSrcSet (§47)", () => {
  it("builds width descriptors across the requested widths", () => {
    expect(responsiveImageSrcSet(BASE, [400, 600])).toBe(
      [
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1690000000/svs/products/SVS-P-000001/front.jpg 400w",
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600/v1690000000/svs/products/SVS-P-000001/front.jpg 600w",
      ].join(", "),
    );
  });

  it("returns null for non-Cloudinary URLs — plain src already covers them", () => {
    expect(responsiveImageSrcSet("https://example.com/a.jpg", [400, 600])).toBeNull();
    expect(responsiveImageSrcSet("/static/a.jpg", [400])).toBeNull();
  });

  it("returns null for absent images and empty width lists", () => {
    expect(responsiveImageSrcSet(null, [400])).toBeNull();
    expect(responsiveImageSrcSet(undefined, [400])).toBeNull();
    expect(responsiveImageSrcSet(BASE, [])).toBeNull();
  });

  it("transforms each candidate through the same chain (f_auto, q_auto)", () => {
    const srcSet = responsiveImageSrcSet(BASE, [400, 600])!;
    for (const candidate of srcSet.split(", ")) {
      expect(candidate).toContain("/upload/f_auto,q_auto,w_");
    }
  });
});
