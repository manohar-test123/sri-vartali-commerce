import type { Metadata } from "next";
import Link from "next/link";

import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listShipments } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Shipping · Sri Vartali" };

const STATUS_STYLES: Record<string, string> = {
  SHIPPED: "border-amber-200 bg-amber-50 text-amber-800",
  IN_TRANSIT: "border-sky-200 bg-sky-50 text-sky-800",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  RETURNED: "border-red-200 bg-red-50 text-red-800",
};

/**
 * Shipment overview (spec §8, §35-§36): every shipment with its courier,
 * tracking id/link and status. Shipment creation stays on the order detail
 * page, where the guarded atomic mark_shipped RPC runs — this page is the
 * fulfilment bird's-eye view.
 */
export default async function ClientShippingPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Shipping" />;
  }
  const shipments = await listShipments();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Orders</p>
      <h1 className="mt-1 font-serif text-3xl text-wine-900">Shipping</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-wine-900/70">
        Every shipment, newest first. Courier and tracking are entered when
        you mark an order shipped from its detail page; customers see the
        same tracking on /track-order and in their WhatsApp message.
      </p>

      {shipments.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-wine-900/25 px-6 py-12 text-center text-sm text-wine-900/50">
          No shipments yet. Mark an order shipped from its{" "}
          <Link
            href="/client/orders?filter=action"
            className="text-wine-800 underline decoration-gold-400 underline-offset-4"
          >
            order page
          </Link>{" "}
          and it will appear here.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {shipments.map((s) => (
            <li key={s.id}>
              <Link
                href={`/client/orders/${s.orderId}`}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-wine-900/15 bg-white p-4 transition-colors hover:border-gold-400"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-wine-900">{s.orderNumber}</p>
                  <p className="mt-0.5 truncate text-xs text-wine-900/60">
                    {s.customerName} · {s.phone}
                  </p>
                  <p className="mt-0.5 text-xs text-wine-900/50">
                    Shipped{" "}
                    {new Date(s.shippedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {s.deliveredAt
                      ? ` · delivered ${new Date(s.deliveredAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}`
                      : ""}
                  </p>
                </div>

                <div className="text-right text-xs text-wine-900/70">
                  <p className="font-medium text-wine-900">{s.courier}</p>
                  <p className="tabular-nums">{s.trackingId}</p>
                  {s.trackingUrl ? (
                    <span className="text-wine-800 underline decoration-gold-400 underline-offset-4">
                      Tracking link available
                    </span>
                  ) : null}
                </div>

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    STATUS_STYLES[s.status] ?? "border-wine-900/20 text-wine-900/70"
                  }`}
                >
                  {s.status.replaceAll("_", " ").toLowerCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
