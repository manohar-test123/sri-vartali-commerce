import { describe, expect, it } from "vitest";

import {
  compactValues,
  effectiveSchema,
  emptyValues,
  parseSchema,
  validateValues,
} from "@/lib/catalog/attributes";
import type { CategoryAttributeSchema } from "@/lib/catalog/types";

const sareeSchema: CategoryAttributeSchema = [
  { key: "fabric", label: "Fabric", type: "text" },
  { key: "color", label: "Color", type: "option", options: ["Wine", "Red"] },
  { key: "blouse_included", label: "Blouse Included", type: "boolean" },
];

describe("effectiveSchema (§4 — subcategory overrides parent when set)", () => {
  it("uses the parent schema when the leaf declares nothing", () => {
    expect(effectiveSchema(sareeSchema, [])).toBe(sareeSchema);
    expect(effectiveSchema(sareeSchema, null)).toBe(sareeSchema);
  });

  it("uses the subcategory schema when it has fields", () => {
    const sub = [{ key: "silk_type", label: "Silk Type", type: "text" as const }];
    expect(effectiveSchema([], sub)).toBe(sub);
  });
});

describe("emptyValues", () => {
  it("seeds booleans false and strings empty", () => {
    expect(emptyValues(sareeSchema)).toEqual({
      fabric: "",
      color: "",
      blouse_included: false,
    });
  });
});

describe("validateValues (rule 12 — configurable, type-checked)", () => {
  it("accepts valid input and drops unknown keys", () => {
    const { values, errors } = validateValues(sareeSchema, {
      fabric: " Kanjivaram ",
      color: "Wine",
      blouse_included: true,
      hacker_field: "nope",
    });
    expect(errors).toEqual({});
    expect(values).toEqual({
      fabric: "Kanjivaram",
      color: "Wine",
      blouse_included: true,
    });
  });

  it("rejects options outside the allowed list", () => {
    const { errors, values } = validateValues(sareeSchema, { color: "Teal" });
    expect(errors.color).toContain("choose one");
    expect(values.color).toBe("");
  });

  it("coerces checkbox-ish booleans", () => {
    const { values } = validateValues(sareeSchema, { blouse_included: "on" });
    expect(values.blouse_included).toBe(true);
  });
});

describe("compactValues", () => {
  it("keeps filled values only, so jsonb stays sparse", () => {
    expect(
      compactValues({ fabric: "Silk", color: "", blouse_included: false }),
    ).toEqual({ fabric: "Silk" });
    expect(compactValues({ color: "", blouse_included: true })).toEqual({
      blouse_included: true,
    });
  });
});

describe("parseSchema", () => {
  it("survives garbage jsonb", () => {
    expect(parseSchema(null)).toEqual([]);
    expect(parseSchema("nope")).toEqual([]);
    expect(parseSchema([{ key: 1 }, { key: "ok", label: "L", type: "text" }])).toEqual([
      { key: "ok", label: "L", type: "text" },
    ]);
  });
});
