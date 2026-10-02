import { describe, expect, it } from "vitest";

import {
  discountPercent,
  formatPaise,
  parseRupeesToPaise,
} from "@/lib/catalog/money";

describe("parseRupeesToPaise (spec §15C — paise integers, never floats)", () => {
  it("parses plain rupees", () => {
    expect(parseRupeesToPaise("5999")).toBe(599900);
  });

  it("strips currency symbols, commas and whitespace", () => {
    expect(parseRupeesToPaise("₹5,999")).toBe(599900);
    expect(parseRupeesToPaise(" 5999 ")).toBe(599900);
  });

  it("keeps exact paise through two decimals", () => {
    expect(parseRupeesToPaise("5999.50")).toBe(599950);
    expect(parseRupeesToPaise("0.99")).toBe(99);
    expect(parseRupeesToPaise("0.9")).toBe(90);
  });

  it("rejects more than two decimals, negatives and garbage", () => {
    expect(parseRupeesToPaise("5999.555")).toBeNull();
    expect(parseRupeesToPaise("-5")).toBeNull();
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("")).toBeNull();
  });
});

describe("formatPaise", () => {
  it("renders Indian-grouped rupees without cents when whole", () => {
    expect(formatPaise(599900)).toBe("₹5,999");
    expect(formatPaise(120000)).toBe("₹1,200");
  });

  it("keeps two cents digits when present", () => {
    expect(formatPaise(599950)).toBe("₹5,999.50");
  });

  it("never renders nonsense for invalid input", () => {
    expect(formatPaise(-1)).toBe("₹0");
    expect(formatPaise(1.5)).toBe("₹0");
  });
});

describe("discountPercent", () => {
  it("computes floor percentage off MRP", () => {
    expect(discountPercent(999900, 599900)).toBe(40);
  });

  it("returns null without an MRP or when not a discount", () => {
    expect(discountPercent(null, 599900)).toBeNull();
    expect(discountPercent(599900, 599900)).toBeNull();
    expect(discountPercent(100, 200)).toBeNull();
  });
});
