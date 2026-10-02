import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getCheckoutView } from "@/lib/cart/queries";

/**
 * /checkout (spec §20–§22): contact + address with §21 PIN validation,
 * order summary, and a server-side review that locks verified totals.
 * Order creation itself (§22 steps 10–16) is Phase 6; this page is the
 * verified hand-off point.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout · Sri Vartali",
};

export default async function CheckoutPage() {
  const view = await getCheckoutView();

  if (view.quote.lines.length === 0) {
    redirect("/cart");
  }

  const lineImages: Record<string, string | null> = {};
  for (const m of view.meta) lineImages[m.variantId] = m.imageUrl;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-wine-900/50">
        <Link href="/cart" className="hover:text-wine-900">
          ← Back to cart
        </Link>
      </nav>
      <h1 className="font-serif text-3xl text-wine-900">Checkout</h1>
      <p className="mt-2 max-w-2xl text-sm text-wine-900/60">
        Where should your order go? We verify stock and totals on the server
        before anything is placed.
      </p>

      <div className="mt-8">
        <CheckoutForm
          lines={view.quote.lines}
          totals={view.quote.totals}
          issues={view.quote.issues}
          mode={view.mode}
          lineImages={lineImages}
        />
      </div>
    </div>
  );
}
