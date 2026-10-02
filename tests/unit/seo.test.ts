import { describe, expect, it } from "vitest";

import {
  effectiveSeo,
  seoDescriptionDefault,
  seoTitleDefault,
} from "@/lib/catalog/seo";

describe("seoTitleDefault (§15G — auto title from name)", () => {
  it("appends the site suffix", () => {
    expect(seoTitleDefault("Kanjivaram Silk Saree")).toBe(
      "Kanjivaram Silk Saree · Sri Vartali",
    );
  });

  it("truncates long names on a word boundary within 60 chars", () => {
    const title = seoTitleDefault(
      "Bridal Kanjivaram Pure Silk Saree With Zari Brocade Border And Matching Blouse Piece",
    );
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain("…"); // the name was truncated, suffix still appended
    expect(title).toContain(" · Sri Vartali");
  });

  it("falls back to a generic title for an empty name", () => {
    expect(seoTitleDefault("   ")).toBe("Product · Sri Vartali");
  });
});

describe("seoDescriptionDefault (§15G — auto description)", () => {
  it("prefers the short description", () => {
    expect(
      seoDescriptionDefault("Wine Saree", "Pure kanjivaram silk in wine & gold"),
    ).toBe("Pure kanjivaram silk in wine & gold");
  });

  it("falls back to the name when no short description exists", () => {
    expect(seoDescriptionDefault("Wine Saree", null)).toBe("Wine Saree");
    expect(seoDescriptionDefault("Wine Saree", "   ")).toBe("Wine Saree");
  });

  it("truncates to 160 chars without cutting a word in half", () => {
    const long =
      "An exquisite handwoven Kanjivaram silk saree in deep wine with temple border, " +
      "gold zari butta across the body, and a rich pallu — includes an unstitched " +
      "blouse piece made from the same silk, ideal for weddings and festive wear.";
    const description = seoDescriptionDefault("Saree", long);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith("…")).toBe(true);
  });

  it("uses a sensible default when nothing is available", () => {
    expect(seoDescriptionDefault("")).toContain("Sri Vartali");
  });
});

describe("effectiveSeo (override beats default)", () => {
  it("returns overrides when present", () => {
    expect(
      effectiveSeo({
        name: "Wine Saree",
        shortDescription: "short",
        seoTitleOverride: "Custom Title",
        seoDescriptionOverride: "Custom description",
      }),
    ).toEqual({ title: "Custom Title", description: "Custom description" });
  });

  it("blank overrides fall through to generated defaults", () => {
    expect(
      effectiveSeo({
        name: "Wine Saree",
        shortDescription: "A lovely saree",
        seoTitleOverride: "  ",
        seoDescriptionOverride: "",
      }),
    ).toEqual({
      title: "Wine Saree · Sri Vartali",
      description: "A lovely saree",
    });
  });
});
