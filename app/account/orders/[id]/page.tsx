import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { formatPaise } from "@/lib/catalog/money";
import { getAccountOrder } from "@/lib/account/queries";
import { getLatestShipment } from "@/lib/orders/queries";
import {
  FULFILMENT_STATUS_CLASSES,
  FULFILMENT_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_CLASSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/status";
import { variantLabel } from "@/lib/orders/snapshot";
import type { AddressInput } from "@/lib/checkout/address";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return {
    title: `Order · Sri Vartali`,
    robots: { index: false, follow: false },
  };
}

/**
 * Customer's own order detail (spec §7 /account/orders/[id]). Ownership is
 * re-derived from the session (claimed customer row or account email); a
 * foreign id is a plain 404. Shows everything the customer knows anyway:
 * items, totals, full delivery address, tracking.
 */
export default async function AccountOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  if (session.status !== "authenticated") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24">
        <h1 className="font-serif text-3xl text-wine-900">Order</h1>
        <p className="mt-4 text-sm leading-6 text-wine-900/70">
          Please{" "}
          <Link href={`/account/login?next=/account/orders/${id}`} className="underline decoration-gold-400 underline-offset-2">
            sign in
          </Link>{" "}
          to view this order.
        </p>
      </div>
    );
  }

  const found = await getAccountOrder(session.user.id, session.user.email, id);
  if (!found) notFound();
  const { order, items } = found;
  const shipment = await getLatestShipment(order.id);
  const placed = new Date(order.created_at).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });
  const address = order.shipping_address_snapshot as AddressInput;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/account/orders"
        className="text-sm text-wine-900/60 underline underline-offset-2 hover:text-wine-900"
      >
        ← Your orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-wine-900">
            {order.order_number}
          </h1>
          <p className="mt-1 text-xs text-wine-900/50">Placed {placed}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${PAYMENT_STATUS_CLASSES[order.payment_status]}`}>
            {PAYMENT_STATUS_LABELS[order.payment_status]}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${FULFILMENT_STATUS_CLASSES[order.fulfilment_status]}`}>
            {FULFILMENT_STATUS_LABELS[order.fulfilment_status]}
          </span>
          {order.order_status === "CANCELLED" ? (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ORDER_STATUS_CLASSES[order.order_status]}`}>
              {ORDER_STATUS_LABELS[order.order_status]}
            </span>
          ) : null}
        </div>
      </div>

      {order.order_status === "CANCELLED" ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          This order was cancelled. If you believe this is a mistake, message
          us on WhatsApp.
        </p>
      ) : null}

      <section aria-labelledby="items-heading" className="mt-8">
        <h2 id="items-heading" className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-wine-900/10 rounded-xl border border-wine-900/15 bg-white">
          {items.map((item) => {
            const label = variantLabel(item.selected_attributes);
            return (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-wine-900">
                    {item.product_name_snapshot}
                  </p>
                  <p className="mt-0.5 text-xs text-wine-900/50">
                    {item.product_code_snapshot}
                    {label ? ` · ${label}` : ""} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium text-wine-900">
                  {formatPaise(item.line_total_paise)}
                </p>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatPaise(order.subtotal_paise)} />
          {order.discount_paise > 0 ? (
            <Row label="Discount" value={`− ${formatPaise(order.discount_paise)}`} />
          ) : null}
          <Row
            label="Shipping"
            value={order.shipping_paise === 0 ? "Free" : formatPaise(order.shipping_paise)}
          />
          <div className="flex justify-between border-t border-wine-900/10 pt-2 font-medium text-wine-900">
            <dt>Total</dt>
            <dd>{formatPaise(order.total_paise)}</dd>
          </div>
        </dl>
      </section>

      {shipment ? (
        <section aria-labelledby="shipment-heading" className="mt-8 rounded-2xl border border-wine-900/10 bg-white/70 p-5 text-sm text-wine-900/80">
          <h2 id="shipment-heading" className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Courier
          </h2>
          <p className="mt-2">
            {shipment.courier} · Tracking ID{" "}
            <span className="font-medium text-wine-900">{shipment.tracking_id}</span>
          </p>
          {shipment.tracking_url ? (
            <a
              href={shipment.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-full bg-wine-900 px-6 py-2.5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-wine-800"
            >
              Track with courier ↗
            </a>
          ) : (
            <p className="mt-2 text-xs text-wine-900/50">
              Track this ID on the {shipment.courier} website.
            </p>
          )}
        </section>
      ) : null}

      <section aria-labelledby="address-heading" className="mt-8">
        <h2 id="address-heading" className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Delivery address
        </h2>
        <p className="mt-3 rounded-xl border border-wine-900/15 bg-white p-4 text-sm leading-6 text-wine-900/80">
          {order.customer_name}
          <br />
          {address.house}, {address.street}
          <br />
          {address.area}
          {address.landmark ? (
            <>
              <br />
              Landmark: {address.landmark}
            </>
          ) : null}
          {address.locality || address.district ? (
            <>
              <br />
              {[address.locality, address.district].filter(Boolean).join(", ")}
            </>
          ) : null}
          {address.state ? (
            <>
              <br />
              {address.state} — {address.pinCode}
            </>
          ) : (
            <>
              <br />
              {address.pinCode}
            </>
          )}
        </p>
      </section>

      <p className="mt-6 text-xs text-wine-900/50">
        Status giving you trouble?{" "}
        <Link href="/track-order" className="underline underline-offset-2 hover:text-wine-900">
          Track this order
        </Link>{" "}
        for the step-by-step progress view.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-wine-900/70">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
