import { describe, expect, it } from "vitest";

import { normalizeUtrReference } from "@/lib/orders/payment";

describe("normalizeUtrReference (§32)", () => {
  it("keeps the field optional — blank normalizes to null", () => {
    expect(normalizeUtrReference("")).toEqual({ ok: true, value: null });
    expect(normalizeUtrReference("   ")).toEqual({ ok: true, value: null });
  });

  it("trims and accepts realistic bank references", () => {
    expect(normalizeUtrReference(" 402912345678 ")).toEqual({
      ok: true,
      value: "402912345678",
    });
    expect(normalizeUtrReference("SBIN123A-5678")).toEqual({
      ok: true,
      value: "SBIN123A-5678",
    });
  });

  it("rejects junk that would not survive as a reference", () => {
    expect(normalizeUtrReference("ab").ok).toBe(false); // too short
    expect(normalizeUtrReference("x".repeat(41)).ok).toBe(false); // too long
    expect(normalizeUtrReference("has space").ok).toBe(false);
    expect(normalizeUtrReference("UTR/123").ok).toBe(false); // slash
    expect(normalizeUtrReference("₹123456").ok).toBe(false);
  });
});
