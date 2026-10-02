/**
 * Order-item snapshot helpers (spec §24).
 *
 * `selected_attributes` snapshots the variant's attribute values at
 * purchase time ({size:"M", color:"Wine"}). The label flattens it for UI
 * and the §27 WhatsApp message: "M · Wine", or null for DEFAULT variants.
 */

export type SelectedAttributes = Record<string, unknown>;

export function variantLabel(attributes: SelectedAttributes | null): string | null {
  const entries = Object.entries(attributes ?? {}).filter(
    ([, v]) => v !== null && v !== "" && v !== undefined,
  );
  if (entries.length === 0) return null;
  return entries.map(([, v]) => String(v)).join(" · ");
}
