import { describe, expect, it } from "vitest";

import {
  buildQuery,
  categoryScope,
  distinctAttributeValues,
  filterProducts,
  matchesQuery,
  paginate,
  parseFilters,
  pruneAttributeFilters,
  schemaFacetFields,
  sortProducts,
} from "@/lib/storefront/search";
import type { CategoryNode } from "@/lib/storefront/search";
import type { StoreProductSummary } from "@/lib/storefront/types";

function product(
  overrides: Partial<StoreProductSummary> & { id: string; slug: string },
): StoreProductSummary {
  return {
    name: `Product ${overrides.id}`,
    productCode: `SVS-P-${overrides.id.padStart(6, "0")}`,
    categorySlug: "sarees",
    categoryName: "Sarees",
    categoryParentName: null,
    skus: [`${overrides.id}-DEFAULT`],
    pricePaise: 100000,
    mrpPaise: null,
    images: [],
    colorLabel: "Wine",
    materialLabel: "Silk",
    availability: "IN_STOCK",
    lowStock: false,
    isNew: false,
    publishedAt: "2026-10-01T00:00:00Z",
    attributes: { color: "Wine", fabric: "Silk", occasion: "Wedding" },
    collectionSlugs: ["festive-edit"],
    collectionNames: ["Festive Edit"],
    rating: null,
    ...overrides,
  };
}

const products: StoreProductSummary[] = [
  product({
    id: "1",
    slug: "wine-silk-saree",
    name: "Wine Silk Saree",
    pricePaise: 1850000,
    attributes: {
      color: "Wine",
      fabric: "Silk",
      occasion: "Wedding",
      weave: "Banarasi",
      blouse_included: true,
    },
    publishedAt: "2026-10-02T00:00:00Z",
  }),
  product({
    id: "2",
    slug: "ivory-cotton-kurti",
    name: "Ivory Cotton Kurti",
    pricePaise: 145000,
    attributes: { color: "Ivory", material: "Cotton", occasion: "Casual" },
    colorLabel: "Ivory",
    materialLabel: "Cotton",
    categorySlug: "kurtis",
    categoryName: "Kurtis",
    collectionSlugs: [],
    collectionNames: [],
    publishedAt: "2026-09-20T00:00:00Z",
  }),
  product({
    id: "3",
    slug: "sold-out-velvet-dress",
    name: "Velvet Anarkali Dress",
    pricePaise: 740000,
    attributes: {
      color: "Wine",
      material: "Velvet",
      occasion: "Festive",
      size: "M",
      fit: "A-Line",
    },
    materialLabel: "Velvet",
    categorySlug: "dresses",
    categoryName: "Dresses",
    availability: "SOLD_OUT",
    collectionSlugs: [],
    collectionNames: [],
    publishedAt: "2026-10-01T00:00:00Z",
  }),
];

const categories: CategoryNode[] = [
  {
    id: "c1",
    name: "Sarees",
    slug: "sarees",
    parentId: null,
    position: 1,
    attributeSchema: [
      { key: "fabric", label: "Fabric", type: "text", filterable: true },
      { key: "color", label: "Color", type: "option", filterable: true, options: ["Wine"] },
      { key: "weave", label: "Weave", type: "text", filterable: true },
      { key: "zari", label: "Zari", type: "text" },
      { key: "blouse_included", label: "Blouse Included", type: "boolean", filterable: true },
    ],
  },
  {
    id: "c1-1",
    name: "Silk Sarees",
    slug: "sarees-silk",
    parentId: "c1",
    position: 1,
    attributeSchema: [
      { key: "weave", label: "Weave Type", type: "text", filterable: true },
    ],
  },
  {
    id: "c2",
    name: "Dresses",
    slug: "dresses",
    parentId: null,
    position: 2,
    attributeSchema: [
      { key: "material", label: "Material", type: "text", filterable: true },
      { key: "size", label: "Size", type: "option", filterable: true, options: ["M", "L"] },
      { key: "fit", label: "Fit", type: "text", filterable: true },
    ],
  },
  {
    id: "c3",
    name: "Kurtis",
    slug: "kurtis",
    parentId: null,
    position: 3,
    attributeSchema: [],
  },
];

describe("parseFilters (§40 URL → filters)", () => {
  it("parses repeatable dimensions, price bounds, sort and page", () => {
    const f = parseFilters({
      q: " silk ",
      color: ["Wine", "Ivory"],
      occasion: "Wedding",
      min: "1000",
      max: "20,000",
      stock: "in_stock",
      sort: "price_asc",
      page: "2",
    });
    expect(f.q).toBe("silk");
    expect(f.colors).toEqual(["Wine", "Ivory"]);
    expect(f.occasions).toEqual(["Wedding"]);
    expect(f.minPricePaise).toBe(100000);
    expect(f.maxPricePaise).toBe(2000000);
    expect(f.inStockOnly).toBe(true);
    expect(f.sort).toBe("price_asc");
    expect(f.page).toBe(2);
  });

  it("defaults to newest sort, page 1, unbounded price", () => {
    const f = parseFilters({});
    expect(f.sort).toBe("newest");
    expect(f.page).toBe(1);
    expect(f.minPricePaise).toBeNull();
    expect(f.categorySlug).toBeNull();
  });

  it("rejects junk sort/page/min values", () => {
    const f = parseFilters({ sort: "hacky", page: "-3", min: "abc" });
    expect(f.sort).toBe("newest");
    expect(f.page).toBe(1);
    expect(f.minPricePaise).toBeNull();
  });

  it("parses repeatable f_<key> params into attributeFilters", () => {
    const f = parseFilters({
      f_weave: ["Banarasi", "Handloom"],
      f_size: "M",
    });
    expect(f.attributeFilters).toEqual({
      weave: ["Banarasi", "Handloom"],
      size: ["M"],
    });
  });

  it("drops blank f_<key> values and bare f_ params", () => {
    const f = parseFilters({ f_weave: [" ", ""], f_: "x" });
    expect(f.attributeFilters).toEqual({});
  });

  it("keeps only schema-declared keys when attributeKeys is given", () => {
    const f = parseFilters(
      { f_weave: "Banarasi", f_size: "M", f_hack: "1" },
      { attributeKeys: ["weave"] },
    );
    expect(f.attributeFilters).toEqual({ weave: ["Banarasi"] });
  });
});

describe("pruneAttributeFilters (stale URL keys)", () => {
  it("drops keys outside the declared facet vocabulary", () => {
    const f = parseFilters({ f_weave: "Banarasi", f_size: "M" });
    const pruned = pruneAttributeFilters(f, ["weave"]);
    expect(pruned.attributeFilters).toEqual({ weave: ["Banarasi"] });
  });

  it("keeps the filters object shallow-equal otherwise", () => {
    const f = parseFilters({ color: ["Wine"], f_size: "M" });
    const pruned = pruneAttributeFilters(f, []);
    expect(pruned.colors).toEqual(["Wine"]);
    expect(pruned.attributeFilters).toEqual({});
  });
});

describe("buildQuery (filters → URL)", () => {
  it("round-trips a fully populated filter set", () => {
    const f = parseFilters({
      q: "silk",
      color: ["Wine"],
      occasion: ["Wedding"],
      fabric: ["Silk"],
      f_weave: "Banarasi",
      min: "1000",
      sort: "price_desc",
      page: "3",
    });
    const again = parseFilters(
      Object.fromEntries(new URLSearchParams(buildQuery(f))),
    );
    expect(again).toEqual(f);
  });

  it("omits defaults for clean canonical URLs", () => {
    expect(buildQuery(parseFilters({}))).toBe("");
  });

  it("emits f_<key> params in sorted key order for canonical URLs", () => {
    const f = parseFilters({ f_size: "M", f_weave: "Banarasi" });
    expect(buildQuery(f)).toBe("?f_size=M&f_weave=Banarasi");
  });
});

describe("categoryScope (§41 category subtree)", () => {
  it("includes the category and all descendants", () => {
    expect(categoryScope(categories, "sarees")).toEqual(
      new Set(["sarees", "sarees-silk"]),
    );
  });

  it("a leaf category scopes to itself only", () => {
    expect(categoryScope(categories, "sarees-silk")).toEqual(
      new Set(["sarees-silk"]),
    );
  });
});

describe("matchesQuery (§40 free text)", () => {
  const p = products[0];

  it("matches name, product code, SKU and attribute values case-insensitively", () => {
    expect(matchesQuery(p, "wine silk")).toBe(true);
    expect(matchesQuery(p, "svs-p-000001")).toBe(true);
    expect(matchesQuery(p, "1-DEFAULT")).toBe(true);
    expect(matchesQuery(p, "wedding")).toBe(true);
    expect(matchesQuery(p, "Kanjivaram")).toBe(false);
  });

  it("matches collection names (§40 free text)", () => {
    expect(matchesQuery(p, "festive edit")).toBe(true);
    expect(matchesQuery(products[1], "festive edit")).toBe(false);
  });

  it("requires every token to match somewhere", () => {
    expect(matchesQuery(p, "wine kanjivaram")).toBe(false);
  });
});

describe("filterProducts (§40 dimensions)", () => {
  it("filters by category subtree", () => {
    const f = parseFilters({ category: "sarees" });
    expect(filterProducts(products, f, categories).map((p) => p.slug)).toEqual([
      "wine-silk-saree",
    ]);
  });

  it("filters by collection slug", () => {
    const f = parseFilters({ collection: "festive-edit" });
    expect(filterProducts(products, f, categories)).toHaveLength(1);
  });

  it("multi-select color is OR", () => {
    const f = parseFilters({ color: ["Wine", "Ivory"] });
    expect(filterProducts(products, f, categories)).toHaveLength(3);
  });

  it("fabric dimension matches fabric OR material values", () => {
    const f = parseFilters({ fabric: ["Cotton"] });
    expect(filterProducts(products, f, categories).map((p) => p.slug)).toEqual([
      "ivory-cotton-kurti",
    ]);
  });

  it("price bounds use paise comparisons", () => {
    // kurti ₹1,450 is below the ₹5,000 floor; dress ₹7,400 is in range
    const f = parseFilters({ min: "5000", max: "10000" });
    const hits = filterProducts(products, f, categories);
    expect(hits.map((p) => p.slug)).toEqual(["sold-out-velvet-dress"]);
  });

  it("in-stock only drops sold-out but keeps the row listed otherwise (§16)", () => {
    const all = filterProducts(products, parseFilters({}), categories);
    expect(all).toHaveLength(3);
    const inStock = filterProducts(
      products,
      parseFilters({ stock: "in_stock" }),
      categories,
    );
    expect(inStock.map((p) => p.slug)).not.toContain("sold-out-velvet-dress");
  });

  it("dimensions AND together", () => {
    const f = parseFilters({ color: ["Wine"], occasion: ["Festive"] });
    expect(filterProducts(products, f, categories).map((p) => p.slug)).toEqual([
      "sold-out-velvet-dress",
    ]);
  });

  it("schema-driven facet: OR within a key, AND with fixed dimensions", () => {
    const weave = filterProducts(
      products,
      parseFilters({ f_weave: ["Banarasi", "Handloom"] }),
      categories,
    );
    expect(weave.map((p) => p.slug)).toEqual(["wine-silk-saree"]);

    const weaveAndColor = filterProducts(
      products,
      parseFilters({ f_weave: "Banarasi", color: ["Wine"] }),
      categories,
    );
    expect(weaveAndColor.map((p) => p.slug)).toEqual(["wine-silk-saree"]);

    const weaveWrongColor = filterProducts(
      products,
      parseFilters({ f_weave: "Banarasi", color: ["Ivory"] }),
      categories,
    );
    expect(weaveWrongColor).toHaveLength(0);
  });

  it("schema-driven facet: AND across keys", () => {
    const f = parseFilters({ f_size: "M", f_fit: "A-Line" });
    expect(filterProducts(products, f, categories).map((p) => p.slug)).toEqual([
      "sold-out-velvet-dress",
    ]);
  });

  it("schema-driven facet: products without the attribute never match", () => {
    // saree and kurti carry no `size`; only the dress does
    const f = parseFilters({ f_size: "M" });
    expect(filterProducts(products, f, categories).map((p) => p.slug)).toEqual([
      "sold-out-velvet-dress",
    ]);
  });

  it("schema-driven facet: boolean attribute values are not facet values", () => {
    // blouse_included is true (boolean) on the saree — string filters match
    // nothing even when the key is selected
    const f = parseFilters({ f_blouse_included: "true" });
    expect(filterProducts(products, f, categories)).toHaveLength(0);
  });
});

describe("sortProducts", () => {
  it("sorts newest first by default", () => {
    expect(sortProducts(products, "newest").map((p) => p.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
  });

  it("sorts by price ascending and descending", () => {
    expect(sortProducts(products, "price_asc").map((p) => p.pricePaise)).toEqual(
      [145000, 740000, 1850000],
    );
    expect(
      sortProducts(products, "price_desc").map((p) => p.pricePaise),
    ).toEqual([1850000, 740000, 145000]);
  });
});

describe("paginate", () => {
  it("slices pages of 24 and clamps out-of-range pages", () => {
    const many = Array.from({ length: 30 }, (_, i) => product({ id: String(i), slug: `p-${i}` }));
    const page1 = paginate(many, 1);
    expect(page1.items).toHaveLength(24);
    expect(page1.pageCount).toBe(2);
    const beyond = paginate(many, 99);
    expect(beyond.page).toBe(2);
    expect(beyond.items).toHaveLength(6);
  });

  it("an empty set yields one empty page", () => {
    expect(paginate([], 1)).toEqual({ items: [], total: 0, pageCount: 1, page: 1 });
  });
});

describe("distinctAttributeValues", () => {
  it("unions values across keys, trimmed, sorted, de-duplicated", () => {
    expect(distinctAttributeValues(products, ["fabric", "material"])).toEqual([
      "Cotton",
      "Silk",
      "Velvet",
    ]);
  });
});

describe("schemaFacetFields (§40 category-specific facets)", () => {
  it("unions filterable string fields of all categories when unscoped", () => {
    expect(schemaFacetFields(categories, null)).toEqual([
      { key: "weave", label: "Weave" },
      { key: "size", label: "Size" },
      { key: "fit", label: "Fit" },
    ]);
  });

  it("excludes fixed dimensions, non-filterable fields and booleans", () => {
    const keys = schemaFacetFields(categories, null).map((f) => f.key);
    expect(keys).not.toContain("color");
    expect(keys).not.toContain("fabric");
    expect(keys).not.toContain("material");
    expect(keys).not.toContain("occasion");
    expect(keys).not.toContain("zari");
    expect(keys).not.toContain("blouse_included");
  });

  it("scopes to the category subtree", () => {
    const sarees = schemaFacetFields(
      categories,
      categoryScope(categories, "sarees"),
    );
    expect(sarees).toEqual([{ key: "weave", label: "Weave" }]);

    const dresses = schemaFacetFields(
      categories,
      categoryScope(categories, "dresses"),
    );
    expect(dresses.map((f) => f.key)).toEqual(["size", "fit"]);
  });

  it("first declaration wins on key collisions across categories", () => {
    // sarees-silk re-declares weave with a different label; the parent's
    // category-position-first declaration keeps its label
    const sarees = schemaFacetFields(
      categories,
      categoryScope(categories, "sarees"),
    );
    expect(sarees[0].label).toBe("Weave");
  });
});
