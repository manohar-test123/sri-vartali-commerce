import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderActionsPanel } from "@/components/client/order-actions";
import { formatPaise } from "@/lib/catalog/money";
import {
  getOrderById,
  getLatestShipment,
  listOrderHistory,
} from "@/lib/orders/queries";
import { listMessagesForOrder } from "@/lib/whatsapp/queries";
import {
  FULFILMENT_STATUS_CLASSES,
  FULFILMENT_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_CLASSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/status";
import { variantLabel } from "@/lib/orders/snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Order · Sri Vartali" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FIELD_LABELS = {
  order_status: "Order",
  payment_status: "Payment",
  fulfilment_status: "Fulfilment",
} as const;

/** Client order detail (spec §8 /client/orders/[id], §34). */
export default async function ClientOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const found = await getOrderById(id);
  if (!found) notFound();
  const { order, items } = found;
  const history = await listOrderHistory(order.id);
  const whatsappLog = await listMessagesForOrder(order.id);
  const shipment = await getLatestShipment(order.id);
  const address = order.shipping_address_snapshot;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-wine-900/50">
        <Link href="/client/orders" className="hover:text-wine-900">
          ← All orders
        </Link>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
            Order
          </p>
          <h1 className="mt-1 font-serif text-3xl text-wine-900">
            {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-wine-900/60">
            {new Date(order.created_at).toLocaleString("en-IN", {
              dateStyle: "full",
              timeStyle: "short",
            })}
            {order.reservation_expires_at && order.order_status !== "CANCELLED"
              ? ` · reserved until ${new Date(order.reservation_expires_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip
            label={PAYMENT_STATUS_LABELS[order.payment_status]}
            className={PAYMENT_STATUS_CLASSES[order.payment_status]}
          />
          <Chip
            label={FULFILMENT_STATUS_LABELS[order.fulfilment_status]}
            className={FULFILMENT_STATUS_CLASSES[order.fulfilment_status]}
          />
          <Chip
            label={ORDER_STATUS_LABELS[order.order_status]}
            className={ORDER_STATUS_CLASSES[order.order_status]}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              Items ({items.length} {items.length === 1 ? "product" : "products"})
            </h2>
            <ul className="mt-3 divide-y divide-wine-900/10">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  {item.image_snapshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_snapshot}
                      alt=""
                      width={56}
                      height={75}
                      className="h-[75px] w-14 rounded-lg border border-wine-900/10 object-cover"
                    />
                  ) : (
                    <div className="h-[75px] w-14 rounded-lg border border-dashed border-wine-900/20" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-wine-900">
                      {item.product_name_snapshot}
                    </p>
                    <p className="mt-0.5 text-xs text-wine-900/50">
                      {item.product_code_snapshot} · {item.sku_snapshot}
                    </p>
                    {variantLabel(item.selected_attributes) ? (
                      <p className="mt-0.5 text-xs text-wine-900/50">
                        {variantLabel(item.selected_attributes)}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-wine-900/50">
                      × {item.quantity} · {formatPaise(item.unit_price_paise)} each
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-wine-900">
                    {formatPaise(item.line_total_paise)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-wine-900/10 pt-3 text-sm text-wine-900/80">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatPaise(order.subtotal_paise)}</dd>
              </div>
              {order.discount_paise > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <dt>Customer saves (vs MRP)</dt>
                  <dd>−{formatPaise(order.discount_paise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd>{order.shipping_paise === 0 ? "Free" : formatPaise(order.shipping_paise)}</dd>
              </div>
              <div className="flex justify-between border-t border-wine-900/10 pt-2 text-base font-semibold text-wine-900">
                <dt>Total</dt>
                <dd>{formatPaise(order.total_paise)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-wine-900/15 bg-white p-5 text-sm leading-6 text-wine-900/80">
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              Customer &amp; delivery address (snapshot)
            </h2>
            <p className="mt-3">
              <span className="font-medium text-wine-900">{order.customer_name}</span>{" "}
              · {order.phone}
              {order.email ? ` · ${order.email}` : ""}
            </p>
            <p className="mt-1">
              {address.house}, {address.street}
              <br />
              {address.area}
              {address.locality ? `, ${address.locality}` : ""}
              <br />
              {address.district ? `${address.district}, ` : ""}
              {address.state ? `${address.state} - ` : ""}
              {address.pinCode}
              {address.landmark ? (
                <>
                  <br />
                  Landmark: {address.landmark}
                </>
              ) : null}
            </p>
          </section>

          <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              WhatsApp activity
            </h2>
            {whatsappLog.length === 0 ? (
              <p className="mt-3 text-sm text-wine-900/50">
                No automated messages logged for this order yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-wine-900/10 text-sm">
                {whatsappLog.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
                    <span className="text-wine-900/80">
                      {row.direction === "INBOUND" ? "From" : "To"} {row.recipient_phone}
                      {row.template_name ? ` · ${row.template_name}` : ` · ${row.message_type}`}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-wine-900/50">
                      <span>{formatLogTime(row.sent_at ?? row.delivered_at ?? row.failed_at ?? row.created_at)}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 ${
                          row.status === "FAILED"
                            ? "border-red-300 bg-red-50 text-red-800"
                            : row.status === "READ" || row.status === "DELIVERED"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-wine-900/20 bg-wine-900/5 text-wine-900/70"
                        }`}
                      >
                        {row.status === "FAILED" && row.error_code
                          ? `FAILED · ${row.error_code}`
                          : row.status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              Status history
            </h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-wine-900/50">
                No changes since the order was placed.
              </p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {history.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap gap-x-2 text-wine-900/75">
                    <span className="text-wine-900/50">
                      {new Date(entry.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span>
                      {FIELD_LABELS[entry.field]}: {entry.old_value ?? "—"} →{" "}
                      <strong>{entry.new_value}</strong>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="h-fit lg:sticky lg:top-8">
          <OrderActionsPanel
            orderId={order.id}
            orderNumber={order.order_number}
            orderStatus={order.order_status}
            paymentStatus={order.payment_status}
            fulfilmentStatus={order.fulfilment_status}
            paymentVerifiedAt={order.payment_verified_at}
            utrReference={order.utr_reference}
            reservationExpiresAt={order.reservation_expires_at}
            shipment={
              shipment
                ? {
                    courier: shipment.courier,
                    trackingId: shipment.tracking_id,
                    trackingUrl: shipment.tracking_url,
                    shippedAt: shipment.shipped_at,
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
