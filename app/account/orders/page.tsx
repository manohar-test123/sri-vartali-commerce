import type { Metadata } from "next";
import Link from "next/link";

import { getSession } from "@/lib/auth/session";
import { formatPaise } from "@/lib/catalog/money";
import { listAccountOrders } from "@/lib/account/queries";
import {
  FULFILMENT_STATUS_CLASSES,
  FULFILMENT_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_CLASSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your orders · Sri Vartali" };

const chip = (text: string, cls: string) => (
  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
    {text}
  </span>
);

/** Customer order history (spec §7 /account/orders). */
export default async function AccountOrdersPage() {
  const session = await getSession();

  if (session.status !== "authenticated") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24">
        <h1 className="font-serif text-3xl text-wine-900">Your orders</h1>
        <p className="mt-4 text-sm leading-6 text-wine-900/70">
          Please{" "}
          <Link href="/account/login?next=/account/orders" className="underline decoration-gold-400 underline-offset-2">
            sign in
          </Link>{" "}
          to see your orders.
        </p>
      </div>
    );
  }

  const orders = await listAccountOrders(
    session.user.id,
    session.user.email,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Account</p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Your orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-wine-900/25 px-6 py-12 text-center">
          <p className="text-sm text-wine-900/60">
            No orders are linked to this account yet.
          </p>
          <p className="mt-2 text-sm leading-6 text-wine-900/50">
            Orders you place while signed in appear here automatically. To
            link earlier orders, save the phone number you ordered with in{" "}
            <Link
              href="/account/profile"
              className="underline decoration-gold-400 underline-offset-2"
            >
              Profile
            </Link>
            .
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-block rounded-full bg-wine-900 px-6 py-2.5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-wine-800"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((order) => {
            const placed = new Date(order.created_at).toLocaleDateString("en-IN", {
              dateStyle: "medium",
            });
            const summary =
              order.items.length === 0
                ? "—"
                : order.items
                    .map((i) => `${i.product_name_snapshot} × ${i.quantity}`)
                    .join(", ");
            return (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="block rounded-xl border border-wine-900/15 bg-white p-4 transition-colors hover:border-gold-400"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-wine-900">
                      {order.order_number}
                      <span className="ml-2 text-xs font-normal text-wine-900/50">
                        {placed}
                      </span>
                    </p>
                    <p className="font-medium text-wine-900">
                      {formatPaise(order.total_paise)}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-wine-900/60">
                    {summary}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {chip(
                      PAYMENT_STATUS_LABELS[order.payment_status],
                      PAYMENT_STATUS_CLASSES[order.payment_status],
                    )}
                    {chip(
                      FULFILMENT_STATUS_LABELS[order.fulfilment_status],
                      FULFILMENT_STATUS_CLASSES[order.fulfilment_status],
                    )}
                    {order.order_status === "CANCELLED"
                      ? chip(
                          ORDER_STATUS_LABELS[order.order_status],
                          ORDER_STATUS_CLASSES[order.order_status],
                        )
                      : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
