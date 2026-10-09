import type { Metadata } from "next";
import Link from "next/link";

import { OrdersLive } from "@/components/client/orders-live";
import { formatPaise } from "@/lib/catalog/money";
import { listOrders, type OrderListFilter } from "@/lib/orders/queries";
import {
  FULFILMENT_STATUS_CLASSES,
  FULFILMENT_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_CLASSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Orders · Sri Vartali" };

/** Client order list (spec §8, §34). Filters ride ?filter=. */
export default async function ClientOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const active: OrderListFilter = (
    ["all", "pending", "claimed", "action"] as const
  ).includes(filter as OrderListFilter)
    ? (filter as OrderListFilter)
    : "all";

  const orders = await listOrders(active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Orders</p>
      <h1 className="mt-1 font-serif text-3xl text-wine-900">Orders</h1>

      <nav
        aria-label="Filter orders"
        className="mt-6 flex flex-wrap gap-2 text-sm"
      >
        {(
          [
            ["all", "All"],
            ["pending", "Payment pending"],
            ["claimed", "Customer says paid"],
            ["action", "Action required"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={value === "all" ? "/client/orders" : `/client/orders?filter=${value}`}
            aria-current={active === value ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 transition-colors ${
              active === value
                ? "border-wine-900 bg-wine-900 text-ivory-50"
                : "border-wine-900/20 bg-white text-wine-900/70 hover:border-wine-900/40"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-wine-900/25 px-6 py-12 text-center text-sm text-wine-900/50">
          No orders here yet. Orders appear the moment a customer places one
          from the storefront.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/client/orders/${order.id}`}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-wine-900/15 bg-white p-4 transition-colors hover:border-gold-400"
              >
                <div className="flex -space-x-3">
                  {order.items.slice(0, 3).map((item, i) =>
                    item.image_snapshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={item.image_snapshot}
                        alt=""
                        width={44}
                        height={58}
                        className="h-[58px] w-11 rounded-lg border-2 border-white object-cover"
                      />
                    ) : (
                      <div
                        key={i}
                        className="h-[58px] w-11 rounded-lg border-2 border-white bg-wine-900/5"
                      />
                    ),
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-wine-900">
                    {order.order_number}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-wine-900/60">
                    {order.customer_name} · {order.phone}
                    {reservationHint(order.reservation_expires_at)}
                  </p>
                  <p className="mt-0.5 text-xs text-wine-900/50">
                    {new Date(order.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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

                <span className="text-sm font-semibold text-wine-900">
                  {formatPaise(order.total_paise)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* §39: live order/status updates while this page is open. */}
      <OrdersLive />
    </div>
  );
}

function reservationHint(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return " · reservation expired";
  const minutes = Math.round(ms / 60000);
  return minutes > 60
    ? ` · reserved ${Math.round(minutes / 60)}h`
    : ` · reserved ${minutes}m`;
}

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}
