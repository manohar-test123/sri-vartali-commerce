import { describe, expect, it } from "vitest";

import { matchesOrderSearch } from "@/lib/orders/search";

const row = {
  orderNumber: "SVS-ORD-20261002-00129",
  customerName: "Ananya Rao",
  phone: "9849012345",
};

describe("matchesOrderSearch (§58 find order by Order ID)", () => {
  it("matches the full order number case-insensitively", () => {
    expect(matchesOrderSearch(row, "SVS-ORD-20261002-00129")).toBe(true);
    expect(matchesOrderSearch(row, "svs-ord-20261002-00129")).toBe(true);
  });

  it("matches a partial order number paste", () => {
    expect(matchesOrderSearch(row, "20261002")).toBe(true);
    expect(matchesOrderSearch(row, "00129")).toBe(true);
  });

  it("matches customer name and phone", () => {
    expect(matchesOrderSearch(row, "ananya")).toBe(true);
    expect(matchesOrderSearch(row, "9849012345")).toBe(true);
  });

  it("ignores spaces in phone terms", () => {
    expect(matchesOrderSearch(row, "98490 12345")).toBe(true);
  });

  it("blank or missing term matches everything", () => {
    expect(matchesOrderSearch(row, undefined)).toBe(true);
    expect(matchesOrderSearch(row, "   ")).toBe(true);
  });

  it("a term matching none of the three fields is excluded", () => {
    expect(matchesOrderSearch(row, "kanjivaram")).toBe(false);
    expect(matchesOrderSearch(row, "SVS-ORD-20261003-99999")).toBe(false);
  });
});
