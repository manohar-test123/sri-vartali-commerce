import type { Metadata } from "next";
import Link from "next/link";

import { CartLineControls } from "@/components/storefront/cart-line-controls";
import { discountPercent, formatPaise } from "@/lib/catalog/money";
import { getCartView } from "@/lib/cart/queries";

/**
 * /cart (spec §18): multi-product, multi-quantity. Totals here are an
 * estimate rendered from live rows; the binding calculation happens at
 * checkout against re-fetched state (§22) — the page says exactly that.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your cart · Sri Vartali",
};

export default async function CartPage() {
  const { quote, meta } = await getCartView();

  if (quote.lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-serif text-3xl text-wine-900">Your cart</h1>
        <p className="mt-3 text-sm text-wine-900/60">
          Nothing here yet — every listing is a click away from joining it.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-wine-900 px-6 py-2.5 text-sm font-medium text-ivory-50 hover:bg-wine-800"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  const metaByVariant = new Map(meta.map((m) => [m.variantId, m]));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl text-wine-900">Your cart</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-wine-900/10">
          {quote.lines.map((line) => {
            const info = metaByVariant.get(line.variantId);
            const discount =
              line.unitMrpPaise !== null
                ? discountPercent(line.unitMrpPaise, line.unitPricePaise)
                : null;
            return (
              <li key={line.variantId} className="flex gap-4 py-5">
                <Link
                  href={`/product/${line.productSlug}`}
                  className="shrink-0"
                  aria-hidden
                  tabIndex={-1}
                >
                  {info?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={info.imageUrl}
                      alt=""
                      className="h-28 w-22 rounded-xl border border-wine-900/10 object-cover"
                      width={88}
                      height={112}
                    />
                  ) : (
                    <div className="flex h-28 w-22 items-center justify-center rounded-xl border border-dashed border-wine-900/20 text-xs text-wine-900/40">
                      No image
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/product/${line.productSlug}`}
                      className="font-medium text-wine-900 hover:underline"
                    >
                      {line.productName}
                    </Link>
                    <span className="text-sm font-semibold text-wine-900">
                      {formatPaise(line.lineTotalPaise)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-wine-900/50">
                    {line.productCode}
                    {line.variantName ? ` · ${line.variantName}` : ""} ·{" "}
                    {formatPaise(line.unitPricePaise)} each
                    {discount !== null && discount > 0 ? ` · ${discount}% off MRP` : ""}
                  </p>
                  <CartLineControls
                    variantId={line.variantId}
                    quantity={line.quantity}
                    available={info?.available ?? line.quantity}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-2xl border border-wine-900/10 bg-white/70 p-5 lg:sticky lg:top-24">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Estimated total
          </h2>
          <dl className="mt-3 space-y-1.5 text-sm text-wine-900/80">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatPaise(quote.totals.subtotalPaise)}</dd>
            </div>
            {quote.totals.discountPaise > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <dt>You save (vs MRP)</dt>
                <dd>−{formatPaise(quote.totals.discountPaise)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>
                {quote.totals.shippingPaise === 0
                  ? "Free"
                  : formatPaise(quote.totals.shippingPaise)}
              </dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-wine-900/10 pt-2 text-base font-semibold text-wine-900">
              <dt>Total</dt>
              <dd>{formatPaise(quote.totals.totalPaise)}</dd>
            </div>
          </dl>
          {quote.issues.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-red-700">
              {quote.issues.map((issue, i) => (
                <li key={`${issue.variantId}-${i}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-[11px] leading-4 text-wine-900/50">
            Estimate from live prices — your order is verified and totalled
            again at checkout before anything is placed.
          </p>
          <Link
            href="/checkout"
            className="mt-4 block rounded-full bg-wine-900 py-2.5 text-center text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-800"
          >
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
