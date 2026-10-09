import type { Metadata } from "next";

import { CategoryManager } from "@/components/client/category-manager";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listCategoriesWithCounts } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Categories · Sri Vartali" };

/**
 * Category management (spec §8, §4, §41): the structural catalog tree and
 * the attribute schemas that drive the product wizard. Until now these were
 * only editable via SQL — this page is the owner's UI for them.
 */
export default async function ClientCategoriesPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Categories" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  const canEdit =
    role === "CLIENT_OWNER" || role === "CLIENT_STAFF" || role === "SUPER_ADMIN";

  const categories = await listCategoriesWithCounts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Catalog</p>
      <h1 className="mt-1 font-serif text-3xl text-wine-900">Categories</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-wine-900/70">
        Structural product types. A category&rsquo;s attribute schema defines the
        extra fields the product wizard asks for — fabric, colour, occasion and
        so on — so new fashion types never need a code change (rule 1).
      </p>

      <div className="mt-8">
        <CategoryManager categories={categories} canEdit={canEdit} />
      </div>
    </div>
  );
}
