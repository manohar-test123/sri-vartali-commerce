/**
 * Attribute-schema engine (spec §4, rule 12/24).
 *
 * A category's `attribute_schema` (jsonb array) defines its fields; the
 * wizard renders them dynamically and the editor swaps fields automatically
 * when the category changes. Values live in `products.attributes`.
 */

import type {
  AttributeValues,
  CategoryAttributeSchema,
} from "@/lib/catalog/types";

/** Pick the schema that drives the editor: the subcategory's when it defines
 *  fields, else the top-level category's (v1 seeds schemas on parents only). */
export function effectiveSchema(
  categorySchema: CategoryAttributeSchema,
  subcategorySchema: CategoryAttributeSchema | null,
): CategoryAttributeSchema {
  return subcategorySchema && subcategorySchema.length > 0
    ? subcategorySchema
    : categorySchema;
}

/** Blank values map for a schema (booleans false, strings empty). */
export function emptyValues(
  schema: CategoryAttributeSchema,
): AttributeValues {
  const values: AttributeValues = {};
  for (const field of schema) {
    values[field.key] = field.type === "boolean" ? false : "";
  }
  return values;
}

export type FieldErrors = Record<string, string>;

/** Coerce + validate raw form input against the schema. Unknown keys are
 *  dropped — the jsonb column only ever holds declared fields. */
export function validateValues(
  schema: CategoryAttributeSchema,
  raw: Record<string, unknown>,
): { values: AttributeValues; errors: FieldErrors } {
  const values: AttributeValues = {};
  const errors: FieldErrors = {};

  for (const field of schema) {
    const input = raw[field.key];

    if (field.type === "boolean") {
      values[field.key] = input === true || input === "true" || input === "on";
      continue;
    }

    const text = typeof input === "string" ? input.trim() : "";

    if (field.type === "option") {
      if (text === "") {
        values[field.key] = "";
        if (field.required) errors[field.key] = `${field.label} is required`;
      } else if (field.options && !field.options.includes(text)) {
        errors[field.key] = `${field.label}: choose one of the listed options`;
        values[field.key] = "";
      } else {
        values[field.key] = text;
      }
      continue;
    }

    if (text === "" && field.required) {
      errors[field.key] = `${field.label} is required`;
    }
    values[field.key] = text;
  }

  return { values, errors };
}

/** Drop empty-string/false entries so `products.attributes` stays sparse. */
export function compactValues(values: AttributeValues): AttributeValues {
  const out: AttributeValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === false) continue;
    out[key] = value;
  }
  return out;
}

/** Parse the jsonb column defensively (bad shapes render as no fields). */
export function parseSchema(json: unknown): CategoryAttributeSchema {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (f): f is CategoryAttributeSchema[number] =>
      !!f && typeof f === "object" && typeof (f as { key?: unknown }).key === "string",
  );
}
