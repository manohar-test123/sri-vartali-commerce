import { notFound } from "next/navigation";

import { ProductWizard } from "@/components/client/product-wizard";
import { getProductBundle, listCategories } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getProductBundle(id);
  return { title: bundle ? `${bundle.product.name} · Sri Vartali` : "Product" };
}

/** §15 wizard in edit mode — autosaves changes (§16). */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [categories, bundle] = await Promise.all([
    listCategories(),
    getProductBundle(id),
  ]);
  if (!bundle) notFound();

  return <ProductWizard categories={categories} bundle={bundle} />;
}
