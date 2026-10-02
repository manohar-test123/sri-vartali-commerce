import { ProductWizard } from "@/components/client/product-wizard";
import { listCategories } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add product · Sri Vartali" };

/** §15 Add Product Wizard — starts empty; the draft self-creates on first
 *  valid autosave and the URL becomes the edit URL. */
export default async function NewProductPage() {
  const categories = await listCategories();
  return <ProductWizard categories={categories} bundle={null} />;
}
