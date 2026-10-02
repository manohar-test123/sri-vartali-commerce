import Link from "next/link";

import { ProductsTable } from "@/components/client/products-table";
import { listProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Products · Sri Vartali" };

/** Client product list (spec §14). Data via RLS-scoped server query. */
export default async function ClientProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await listProducts(q);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
            Product CMS
          </p>
          <h1 className="mt-1 font-serif text-3xl text-wine-900">Products</h1>
        </div>
        <Link
          href="/client/products/new"
          className="rounded-full bg-wine-900 px-5 py-2.5 text-sm font-medium text-ivory-50 transition hover:bg-wine-800"
        >
          + Add product
        </Link>
      </div>

      <ProductsTable products={products} search={q ?? ""} />
    </div>
  );
}
