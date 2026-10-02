import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/storefront/catalog-view";
import { listStorefrontCollections } from "@/lib/storefront/queries";

/**
 * /collections/[slug] (§7, §41): a marketing edit. Products join via
 * collection_products; scope is locked to the collection slug.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collections = await listStorefrontCollections();
  const collection = collections.find((c) => c.slug === slug);
  if (!collection) return { title: "Collection not found · Sri Vartali" };
  return {
    title: `${collection.name} · Sri Vartali`,
    description:
      collection.description ??
      `The ${collection.name} edit at Sri Vartali — curated pieces, filtered your way.`,
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const collections = await listStorefrontCollections();
  const collection = collections.find((c) => c.slug === slug);
  if (!collection) notFound();

  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
          Collection
        </p>
        <h1 className="mt-1 font-serif text-3xl text-wine-900">{collection.name}</h1>
        {collection.description ? (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-wine-900/70">
            {collection.description}
          </p>
        ) : null}
      </header>
      <CatalogView
        basePath={`/collections/${slug}`}
        params={search}
        scope={{ collectionSlug: slug }}
      />
    </>
  );
}
