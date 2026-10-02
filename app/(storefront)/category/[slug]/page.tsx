import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/storefront/catalog-view";
import { listStorefrontCategories } from "@/lib/storefront/queries";

/**
 * /category/[slug] (§7, §41): structural product type. A parent category
 * shows its whole subtree (Sarees includes Silk Sarees); a leaf shows
 * itself. Scope is locked — the filter panel hides the category picker.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await listStorefrontCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: "Category not found · Sri Vartali" };
  return {
    title: `${category.name} · Sri Vartali`,
    description: `Browse ${category.name} at Sri Vartali — filter by colour, fabric, occasion and price.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const categories = await listStorefrontCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const parent = category.parentId
    ? (categories.find((c) => c.id === category.parentId) ?? null)
    : null;

  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
          {parent ? parent.name : "Category"}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-wine-900">{category.name}</h1>
      </header>
      <CatalogView
        basePath={`/category/${slug}`}
        params={search}
        scope={{ categorySlug: slug, lockedCategory: true }}
      />
    </>
  );
}
