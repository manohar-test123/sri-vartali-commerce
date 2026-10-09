import { describe, expect, it } from "vitest";

import {
  parseAttributeSchemaText,
  stockHealth,
  validateCategoryForm,
  validateCollectionForm,
  validateInventoryAdjustment,
} from "@/lib/dashboard/validation";

/* ── categories ───────────────────────────────────────────────────────── */

describe("validateCategoryForm (§4, §41)", () => {
  const valid = {
    name: "Sarees",
    description: "Handloom silks",
    parentId: "",
    position: "1",
    attributeSchemaText: "",
  };

  it("passes a minimal valid category and normalizes blanks", () => {
    const { errors, value } = validateCategoryForm(valid);
    expect(errors).toEqual({});
    expect(value).toEqual({
      name: "Sarees",
      description: "Handloom silks",
      parentId: null,
      position: 1,
      attributeSchema: [],
    });
  });

  it("keeps a parent id and parses a schema", () => {
    const { errors, value } = validateCategoryForm({
      ...valid,
      parentId: "uuid-1",
      attributeSchemaText:
        '[{"key":"fabric","label":"Fabric","type":"text","filterable":true}]',
    });
    expect(errors).toEqual({});
    expect(value?.parentId).toBe("uuid-1");
    expect(value?.attributeSchema).toEqual([
      { key: "fabric", label: "Fabric", type: "text", filterable: true },
    ]);
  });

  it("rejects missing, blank and over-long names", () => {
    expect(validateCategoryForm({ ...valid, name: "  " }).errors.name).toBeDefined();
    expect(
      validateCategoryForm({ ...valid, name: "x".repeat(81) }).errors.name,
    ).toBeDefined();
  });

  it("rejects non-integer or negative positions; blank means 0", () => {
    expect(validateCategoryForm({ ...valid, position: "2.5" }).errors.position).toBeDefined();
    expect(validateCategoryForm({ ...valid, position: "-1" }).errors.position).toBeDefined();
    expect(validateCategoryForm({ ...valid, position: "" }).value?.position).toBe(0);
  });

  it("rejects invalid schema JSON and non-array schemas", () => {
    expect(
      validateCategoryForm({ ...valid, attributeSchemaText: "{oops" }).errors
        .attributeSchema,
    ).toBeDefined();
    expect(
      validateCategoryForm({ ...valid, attributeSchemaText: '{"key":"a"}' }).errors
        .attributeSchema,
    ).toBeDefined();
  });

  it("rejects malformed schema fields and duplicate keys", () => {
    const cases = [
      '[{"label":"No key","type":"text"}]',
      '[{"key":"Bad Key","label":"X","type":"text"}]',
      '[{"key":"a","type":"text"}]',
      '[{"key":"a","label":"X","type":"emoji"}]',
      '[{"key":"a","label":"X","type":"option"}]',
      '[{"key":"a","label":"X","type":"text"},{"key":"a","label":"Y","type":"text"}]',
    ];
    for (const schema of cases) {
      expect(
        validateCategoryForm({ ...valid, attributeSchemaText: schema }).errors
          .attributeSchema,
      ).toBeDefined();
    }
  });

  it("accepts option fields with options and ignores unknown extras", () => {
    const { errors, value } = validateCategoryForm({
      ...valid,
      attributeSchemaText:
        '[{"key":"color","label":"Color","type":"option","options":["Wine","Gold"],"future":"whatever"}]',
    });
    expect(errors).toEqual({});
    expect(value?.attributeSchema).toEqual([
      { key: "color", label: "Color", type: "option", options: ["Wine", "Gold"] },
    ]);
  });
});

describe("parseAttributeSchemaText", () => {
  it("treats blank input as an empty schema", () => {
    expect(parseAttributeSchemaText("   ")).toEqual({ ok: true, value: [] });
  });

  it("round-trips a real seed schema", () => {
    const seed = JSON.stringify([
      { key: "fabric", label: "Fabric", type: "text", filterable: true },
      {
        key: "color",
        label: "Colour",
        type: "option",
        options: ["Wine", "Ivory", "Gold"],
        filterable: true,
      },
      { key: "occasion", label: "Occasion", type: "text" },
    ]);
    expect(parseAttributeSchemaText(seed)).toEqual({ ok: true, value: JSON.parse(seed) });
  });
});

/* ── collections ──────────────────────────────────────────────────────── */

describe("validateCollectionForm (§41)", () => {
  const valid = { name: "Festive Edit", description: "", position: "2" };

  it("passes and normalizes", () => {
    const { errors, value } = validateCollectionForm(valid);
    expect(errors).toEqual({});
    expect(value).toEqual({ name: "Festive Edit", description: null, position: 2 });
  });

  it("rejects missing names and bad positions", () => {
    expect(validateCollectionForm({ ...valid, name: "" }).errors.name).toBeDefined();
    expect(validateCollectionForm({ ...valid, position: "x" }).errors.position).toBeDefined();
    expect(validateCollectionForm({ ...valid, position: "" }).value?.position).toBe(0);
  });
});

/* ── inventory ────────────────────────────────────────────────────────── */

describe("validateInventoryAdjustment (§15D)", () => {
  const valid = { quantity: "5", lowStockThreshold: "2", note: "" };

  it("passes whole numbers and defaults the threshold to 2", () => {
    expect(validateInventoryAdjustment(valid)).toEqual({
      errors: {},
      value: { quantity: 5, lowStockThreshold: 2, note: null },
    });
    expect(
      validateInventoryAdjustment({ quantity: "3", lowStockThreshold: "", note: "" })
        .value?.lowStockThreshold,
    ).toBe(2);
  });

  it("rejects negative, fractional and non-numeric stock", () => {
    for (const quantity of ["-1", "1.5", "abc", ""]) {
      expect(
        validateInventoryAdjustment({ ...valid, quantity }).errors.quantity,
      ).toBeDefined();
    }
  });

  it("caps the note length", () => {
    expect(
      validateInventoryAdjustment({ ...valid, note: "x".repeat(201) }).errors.note,
    ).toBeDefined();
    expect(
      validateInventoryAdjustment({ ...valid, note: "recounted" }).value?.note,
    ).toBe("recounted");
  });
});

/* ── stock health ─────────────────────────────────────────────────────── */

describe("stockHealth (§26)", () => {
  it("is OUT when nothing is available past reservations", () => {
    expect(stockHealth(3, 3, 2)).toBe("OUT");
    expect(stockHealth(0, 0, 2)).toBe("OUT");
  });

  it("is LOW at or below the threshold, OK above it", () => {
    expect(stockHealth(5, 3, 2)).toBe("LOW");
    expect(stockHealth(5, 3, 1)).toBe("OK");
    expect(stockHealth(10, 0, 2)).toBe("OK");
  });
});
