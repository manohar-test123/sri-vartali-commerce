import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatPaise } from "@/lib/catalog/money";
import { getOrderByNumber } from "@/lib/orders/queries";
import {
  buildOrderWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/lib/orders/whatsapp";
import {
  FULFILMENT_STATUS_CLASSES,
  FULFILMENT_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_CLASSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/status";
import { variantLabel } from "@/lib/orders/snapshot";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Public order page (spec §7 /order/[orderNumber], §2). Reached from the
 * checkout hand-off and the §27 WhatsApp message's Order Link.
 *
 * Sequential order numbers are inherently guessable, so this public view
 * is deliberately coarser than the client dashboard (§34): items, totals
 * and statuses — full name, masked phone, city-level address only. The
 * exact street address stays in the dashboard and the customer's own
 * WhatsApp message.
 */

export const dynamic = "force-dynamic";

const ORDER_NUMBER_PATTERN = /^SVS-ORD-\d{8}-\d+$/;

type PageProps = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber} · Sri Vartali`,
    robots: { index: false, follow: false },
  };
}

function maskPhone(phone: string): string {
  return phone.length === 10
    ? `${phone.slice(0, 2)}•••••${phone.slice(-3)}`
    : "•••";
}

export default async function OrderPage({ params }: PageProps) {
  const { orderNumber } = await params;
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) notFound();

  const found = await getOrderByNumber(orderNumber);
  if (!found) notFound();
  const { order, items } = found;

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("store_settings")
    .select("whatsapp_store_number")
    .eq("id", 1)
    .maybeSingle();
  const storeNumber = settings?.whatsapp_store_number ?? env.whatsapp.storeNumber ?? null;

  const paymentPending =
    order.payment_status === "PENDING" && order.order_status !== "CANCELLED";
  const whatsappUrl = paymentPending && storeNumber
    ? buildWhatsAppUrl(
        storeNumber,
        buildOrderWhatsAppMessage({
          orderNumber: order.order_number,
          lines: items.map((i) => ({
            productName: i.product_name_snapshot,
            productCode: i.product_code_snapshot,
            variantName: variantLabel(i.selected_attributes),
            quantity: i.quantity,
            lineTotalPaise: i.line_total_paise,
          })),
          totalPaise: order.total_paise,
          customerName: order.customer_name,
          phone: order.phone,
          address: order.shipping_address_snapshot,
          orderUrl: `${env.siteUrl}/order/${order.order_number}`,
        }),
      )
    : null;

  const placedAt = new Date(order.created_at).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
        Sri Vartali Sarees
      </p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">
        Order {order.order_number}
      </h1>
      <p className="mt-1 text-sm text-wine-900/60">Placed {placedAt}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <StatusChip
          label={PAYMENT_STATUS_LABELS[order.payment_status]}
          className={PAYMENT_STATUS_CLASSES[order.payment_status]}
        />
        <StatusChip
          label={FULFILMENT_STATUS_LABELS[order.fulfilment_status]}
          className={FULFILMENT_STATUS_CLASSES[order.fulfilment_status]}
        />
        <StatusChip
          label={ORDER_STATUS_LABELS[order.order_status]}
          className={ORDER_STATUS_CLASSES[order.order_status]}
        />
      </div>

      {order.order_status === "CANCELLED" ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          This order was cancelled. If you believe this is a mistake, message
          us on WhatsApp.
        </p>
      ) : paymentPending ? (
        <section className="mt-6 rounded-2xl border border-gold-300 bg-gold-100/50 px-5 py-4 text-sm leading-6 text-wine-900/80">
          <p className="font-medium text-wine-900">Next step: payment</p>
          <p className="mt-1">
            Send your order on WhatsApp to receive payment instructions.
            {order.reservation_expires_at
              ? ` Your items are reserved until ${new Date(
                  order.reservation_expires_at,
                ).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}.`
              : ""}
          </p>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              className="mt-3 inline-block rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Send order on WhatsApp
            </a>
          ) : null}
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-wine-900/10 bg-white/70 p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Items
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
                  {item.product_code_snapshot}
                  {variantLabel(item.selected_attributes)
                    ? ` · ${variantLabel(item.selected_attributes)}`
                    : ""}
                </p>
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
              <dt>You save (vs MRP)</dt>
              <dd>−{formatPaise(order.discount_paise)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>
              {order.shipping_paise === 0
                ? "Free"
                : formatPaise(order.shipping_paise)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-wine-900/10 pt-2 text-base font-semibold text-wine-900">
            <dt>Total</dt>
            <dd>{formatPaise(order.total_paise)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-wine-900/10 bg-white/70 p-5 text-sm text-wine-900/80">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Delivering to
        </h2>
        <p className="mt-2 leading-6">
          {order.customer_name} · {maskPhone(order.phone)}
          <br />
          {[
            order.shipping_address_snapshot.area,
            order.shipping_address_snapshot.district,
            order.shipping_address_snapshot.state,
            order.shipping_address_snapshot.pinCode,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
      </section>
    </div>
  );
}

function StatusChip({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

