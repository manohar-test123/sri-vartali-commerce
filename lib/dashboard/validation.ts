/**
 * Pure validators for the §8 dashboard management pages (categories,
 * collections, inventory). Form-shaped input in, field errors + a
 * normalized value out — no I/O, fully unit-testable.
 */

import type { CategoryAttributeField } from "@/lib/catalog/types";

export type FieldErrors = Record<string, string>;

const FIELD_TYPES = ["text", "option", "boolean"] as const;

/* ── categories (§4, §41) ─────────────────────────────────────────────── */

export interface CategoryFormValue {
  name: string;
  description: string | null;
  parentId: string | null;
  position: number;
  attributeSchema: CategoryAttributeField[];
}

export function validateCategoryForm(raw: {
  name: string;
  description: string;
  parentId: string;
  position: string;
  attributeSchemaText: string;
}): { errors: FieldErrors; value?: CategoryFormValue } {
  const errors: FieldErrors = {};
  const name = raw.name.trim();
  if (name === "") errors.name = "Name is required.";
  if (name.length > 80) errors.name = "Name must be 80 characters or fewer.";

  const position = raw.position.trim() === "" ? 0 : Number(raw.position);
  if (!Number.isSafeInteger(position) || position < 0) {
    errors.position = "Position must be a whole number of 0 or more.";
  }

  const schemaResult = parseAttributeSchemaText(raw.attributeSchemaText);

  if (Object.keys(errors).length > 0 || !schemaResult.ok) {
    if (!schemaResult.ok) errors.attributeSchema = schemaResult.error;
    return { errors };
  }

  return {
    errors: {},
    value: {
      name,
      description: raw.description.trim() || null,
      parentId: raw.parentId !== "" ? raw.parentId : null,
      position,
      attributeSchema: schemaResult.value,
    },
  };
}

/**
 * The category editor edits `attribute_schema` as JSON text (the wizard
 * renders it; this is the authoring surface). Accepts blank (→ []),
 * requires a JSON array of well-formed fields mirroring §4.
 */
export function parseAttributeSchemaText(
  text: string,
): { ok: true; value: CategoryAttributeField[] } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Schema must be a JSON array of fields." };
  }

  const fields: CategoryAttributeField[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: `Field ${i + 1}: must be an object.` };
    }
    const f = item as Record<string, unknown>;
    const key = typeof f.key === "string" ? f.key.trim() : "";
    const label = typeof f.label === "string" ? f.label.trim() : "";
    const type = f.type;
    if (key === "" || !/^[a-z0-9_]+$/.test(key)) {
      return {
        ok: false,
        error: `Field ${i + 1}: key must be lowercase letters, digits or underscores.`,
      };
    }
    if (label === "") {
      return { ok: false, error: `Field ${i + 1}: label is required.` };
    }
    if (typeof type !== "string" || !FIELD_TYPES.includes(type as never)) {
      return {
        ok: false,
        error: `Field ${i + 1}: type must be one of text, option, boolean.`,
      };
    }
    let options: string[] | undefined;
    if (type === "option") {
      if (!Array.isArray(f.options) || f.options.length === 0) {
        return {
          ok: false,
          error: `Field ${i + 1}: option fields need a non-empty "options" array.`,
        };
      }
      const cleaned = f.options.map((o) => String(o).trim()).filter(Boolean);
      if (cleaned.length === 0) {
        return { ok: false, error: `Field ${i + 1}: options must be non-empty strings.` };
      }
      options = cleaned;
    }
    if (fields.some((existing) => existing.key === key)) {
      return { ok: false, error: `Field ${i + 1}: duplicate key "${key}".` };
    }
    fields.push({
      key,
      label,
      type: type as CategoryAttributeField["type"],
      ...(options ? { options } : {}),
      ...(f.required === true ? { required: true } : {}),
      ...(f.filterable === true ? { filterable: true } : {}),
    });
  }
  return { ok: true, value: fields };
}

/* ── collections (§41) ────────────────────────────────────────────────── */

export interface CollectionFormValue {
  name: string;
  description: string | null;
  position: number;
}

export function validateCollectionForm(raw: {
  name: string;
  description: string;
  position: string;
}): { errors: FieldErrors; value?: CollectionFormValue } {
  const errors: FieldErrors = {};
  const name = raw.name.trim();
  if (name === "") errors.name = "Name is required.";
  if (name.length > 80) errors.name = "Name must be 80 characters or fewer.";

  const position = raw.position.trim() === "" ? 0 : Number(raw.position);
  if (!Number.isSafeInteger(position) || position < 0) {
    errors.position = "Position must be a whole number of 0 or more.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors: {},
    value: { name, description: raw.description.trim() || null, position },
  };
}

/* ── inventory adjustments (§15D) ─────────────────────────────────────── */

export interface InventoryAdjustmentValue {
  quantity: number;
  lowStockThreshold: number;
  note: string | null;
}

export function validateInventoryAdjustment(raw: {
  quantity: string;
  lowStockThreshold: string;
  note: string;
}): { errors: FieldErrors; value?: InventoryAdjustmentValue } {
  const errors: FieldErrors = {};

  const quantityText = raw.quantity.trim();
  const quantity = Number(quantityText);
  // Quantity is required: an empty submit must not silently zero the stock.
  if (
    quantityText === "" ||
    !/^-?\d+$/.test(quantityText) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0
  ) {
    errors.quantity = "Stock must be a whole number of 0 or more.";
  }

  const threshold = raw.lowStockThreshold.trim() === "" ? 2 : Number(raw.lowStockThreshold);
  if (
    !Number.isSafeInteger(threshold) ||
    threshold < 0 ||
    (raw.lowStockThreshold.trim() !== "" && !/^\d+$/.test(raw.lowStockThreshold.trim()))
  ) {
    errors.lowStockThreshold = "Low-stock threshold must be 0 or more.";
  }

  const note = raw.note.trim();
  if (note.length > 200) errors.note = "Note must be 200 characters or fewer.";

  if (Object.keys(errors).length > 0) return { errors };

  return { errors: {}, value: { quantity, lowStockThreshold: threshold, note: note || null } };
}

/* ── stock health (shared display helper) ─────────────────────────────── */

export type StockHealth = "OUT" | "LOW" | "OK";

/** Available = on-hand minus reserved (§26); health drives the chip. */
export function stockHealth(
  quantity: number,
  reservedQuantity: number,
  lowStockThreshold: number,
): StockHealth {
  const available = quantity - reservedQuantity;
  if (available <= 0) return "OUT";
  if (available <= lowStockThreshold) return "LOW";
  return "OK";
}
