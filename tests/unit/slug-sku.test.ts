import { describe, expect, it } from "vitest";

import { slugify, uniqueSlug } from "@/lib/catalog/slug";
import { defaultVariantSku, variantSku } from "@/lib/catalog/sku";

describe("slugify", () => {
  it("folds case, accents and punctuation", () => {
    expect(slugify("Wine Silk Saree!")).toBe("wine-silk-saree");
    expect(slugify("  Kanchipuram   Silk  ")).toBe("kanchipuram-silk");
  });

  it("never returns slashes or uppercase", () => {
    expect(slugify("A/B C")).toBe("a-b-c");
  });
});

describe("uniqueSlug", () => {
  it("returns the root when free", () => {
    expect(uniqueSlug("Wine Saree", ["other-saree"])).toBe("wine-saree");
  });

  it("appends -2, -3 … around taken slugs", () => {
    expect(uniqueSlug("wine-saree", ["wine-saree"])).toBe("wine-saree-2");
    expect(uniqueSlug("wine saree", ["wine-saree", "wine-saree-2"])).toBe(
      "wine-saree-3",
    );
  });
});

describe("variant SKUs (spec §3 — ^SVS-P-\\d{6}-.+$)", () => {
  it("default variant is <code>-DEFAULT", () => {
    expect(defaultVariantSku("SVS-P-000121")).toBe("SVS-P-000121-DEFAULT");
  });

  it("named variants slug the name and uniquify", () => {
    expect(variantSku("SVS-P-000121", "Blouse 34", [])).toBe(
      "SVS-P-000121-blouse-34",
    );
    expect(
      variantSku("SVS-P-000121", "Blouse 34", ["SVS-P-000121-blouse-34"]),
    ).toBe("SVS-P-000121-blouse-34-2");
  });

  it("always matches the database CHECK", () => {
    expect(defaultVariantSku("SVS-P-000001")).toMatch(/^SVS-P-\d{6}-.+$/);
    expect(variantSku("SVS-P-999999", "X", [])).toMatch(/^SVS-P-\d{6}-.+$/);
  });

  it("provides a fallback when the variant name has no Latin characters", () => {
    expect(variantSku("SVS-P-000121", "భారత్", [])).toBe(
      "SVS-P-000121-variant",
    );
    expect(variantSku("SVS-P-000121", "!!!", [])).toBe(
      "SVS-P-000121-variant",
    );
    expect(variantSku("SVS-P-000121", "భారత్", ["SVS-P-000121-variant"])).toBe(
      "SVS-P-000121-variant-2",
    );
  });
});
