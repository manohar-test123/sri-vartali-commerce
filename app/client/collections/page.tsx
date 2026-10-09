import type { Metadata } from "next";

import { CollectionManager } from "@/components/client/collection-manager";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import {
  listCollectionsWithProducts,
  listProductsForPickers,
} from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Collections · Sri Vartali" };

/**
 * Collection management (spec §8, §41): marketing groupings that cut across
 * categories, with product membership — the storefront /collections/[slug]
 * pages read exactly this data.
 */
export default async function ClientCollectionsPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Collections" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  const canEdit =
    role === "CLIENT_OWNER" || role === "CLIENT_STAFF" || role === "SUPER_ADMIN";

  const [collections, products] = await Promise.all([
    listCollectionsWithProducts(),
    listProductsForPickers(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Catalog</p>
      <h1 className="mt-1 font-serif text-3xl text-wine-900">Collections</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-wine-900/70">
        Editorial groupings — Festive Edit, Wedding Edit, New Season — that a
        product can join from any category. Collections appear on the
        storefront as soon as they are visible and have products.
      </p>

      <div className="mt-8">
        <CollectionManager
          collections={collections}
          products={products}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
