import type { Metadata } from "next";

import { CatalogView } from "@/components/storefront/catalog-view";

/** /search (§40): q + the generic filters, results live in the URL. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search · Sri Vartali",
  description: "Search by name, product ID, SKU, fabric, colour or occasion.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
          Search
        </p>
        <h1 className="mt-1 font-serif text-3xl text-wine-900">
          {q.trim() !== "" ? `Results for “${q.trim()}”` : "Find your piece"}
        </h1>
        <form action="/search" method="get" role="search" className="mt-4">
          <label htmlFor="search-q" className="sr-only">
            Search the store
          </label>
          <input
            id="search-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, product ID, fabric, colour…"
            className="w-full max-w-xl rounded-full border border-wine-900/15 bg-white px-5 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
          />
        </form>
      </header>
      <CatalogView basePath="/search" params={params} />
    </>
  );
}
