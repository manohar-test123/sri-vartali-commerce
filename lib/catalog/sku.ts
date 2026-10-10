/**
 * SKU derivation (spec §3).
 *
 * Every product carries exactly one DEFAULT variant with SKU
 * `<product_code>-DEFAULT` when it has no explicit variants; named variants
 * get `<product_code>-<slug>` — unique within the product.
 */

export function defaultVariantSku(productCode: string): string {
  return `${productCode}-DEFAULT`;
}

export function variantSku(
  productCode: string,
  variantName: string,
  taken: Iterable<string>,
): string {
  const used = new Set(taken);
  const variantSlug = slug(variantName) || "variant";
  const root = `${productCode}-${variantSlug}`;
  if (!used.has(root)) return root;

  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

function slug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
