/** Slug helpers (spec §3, §15A) — slugs are unique, human-readable, stable. */

/** "Wine Silk Saree!" → "wine-silk-saree". ASCII-ish fold; never empty-preserving. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** First free slug: base, base-2, base-3, … against the taken set. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || "product";
  if (!used.has(root)) return root;

  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
