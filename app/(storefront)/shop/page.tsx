import type { Metadata } from "next";

import { CatalogView } from "@/components/storefront/catalog-view";

/** /shop — the whole published catalog with §40 filters. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop all · Sri Vartali",
  description:
    "Browse every published piece — filter by category, colour, fabric, occasion, price and availability.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-600">
          The shop
        </p>
        <h1 className="mt-1 font-serif text-3xl text-wine-900">All pieces</h1>
      </header>
      <CatalogView basePath="/shop" params={params} />
    </>
  );
}
