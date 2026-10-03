import type { Metadata } from "next";
import Link from "next/link";

import { buildTrackSteps } from "@/lib/orders/shipping";
import { getTrackOrderView, type TrackOrderView } from "@/lib/orders/queries";
import { checkRateLimit, formatRetryAfter } from "@/lib/rate-limit";

/**
 * Track order (spec §7 /track-order, §37). A customer enters the order ID
 * plus the phone number used at checkout — the pair is the credential:
 * order numbers alone are sequential and guessable, so a miss and a phone
 * mismatch answer identically. The view is deliberately coarser than even
 * the public order page: a status ladder and the courier/tracking block,
 * no items, totals or address.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track your order · Sri Vartali",
};

type PageProps = {
  searchParams: Promise<{ order?: string; phone?: string }>;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-wine-900/20 bg-white px-3 py-2.5 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-500 focus:outline-none";

export default async function TrackOrderPage({ searchParams }: PageProps) {
  const { order: orderInput, phone: phoneInput } = await searchParams;
  const submitted =
    typeof orderInput === "string" &&
    orderInput.trim() !== "" &&
    typeof phoneInput === "string" &&
    phoneInput.trim() !== "";

  let result: Awaited<ReturnType<typeof getTrackOrderView>> | null = null;
  let throttledAfterSeconds = 0;
  if (submitted) {
    // §46 rate limit: the id/phone pair is the credential — slow down
    // enumeration before the identical-answer lookup runs.
    const trackRate = await checkRateLimit("track_order");
    if (trackRate.allowed) {
      result = await getTrackOrderView(orderInput.trim(), phoneInput.trim());
    } else {
      throttledAfterSeconds = trackRate.retryAfterSeconds;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
        Sri Vartali Sarees
      </p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Track your order</h1>

      <form
        action="/track-order"
        method="get"
        className="mt-8 rounded-2xl border border-wine-900/10 bg-white/70 p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="order" className="block text-xs text-wine-900/60">
              Order ID
            </label>
            <input
              id="order"
              name="order"
              type="text"
              required
              autoComplete="off"
              defaultValue={orderInput ?? ""}
              placeholder="SVS-ORD-20261002-00129"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-xs text-wine-900/60">
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="off"
              defaultValue={phoneInput ?? ""}
              placeholder="10-digit WhatsApp number"
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-full bg-wine-900 px-6 py-2.5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-wine-800"
        >
          Track order
        </button>
      </form>

      {submitted && throttledAfterSeconds > 0 ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Too many tracking lookups from this network. Please try again{" "}
          {formatRetryAfter(throttledAfterSeconds)}.
        </p>
      ) : null}

      {submitted && result?.status === "not_found" ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          We could not find an order with those details. Check the order ID
          and the phone number you used at checkout.
        </p>
      ) : null}

      {result?.status === "found" ? (
        <Result view={result.view} />
      ) : null}
    </div>
  );
}

function Result({ view }: { view: TrackOrderView }) {
  const { shipment } = view;

  if (view.order_status === "CANCELLED") {
    return (
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-900">
        <p className="font-serif text-xl text-wine-900">
          Order {view.order_number}
        </p>
        <p className="mt-1">
          This order was cancelled. If you believe this is a mistake, message
          us on WhatsApp.
        </p>
      </section>
    );
  }

  const steps = buildTrackSteps({
    paymentStatus: view.payment_status,
    fulfilmentStatus: view.fulfilment_status,
  });
  const placed = new Date(view.created_at).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });

  return (
    <>
      <section className="mt-6 rounded-2xl border border-wine-900/10 bg-white/70 p-5">
        <p className="font-serif text-xl text-wine-900">{view.order_number}</p>
        <p className="mt-0.5 text-xs text-wine-900/50">Placed {placed}</p>

        <ol className="mt-5 space-y-0" aria-label="Order progress">
          {steps.map((step, index) => (
            <li key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    step.state === "done"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : step.state === "current"
                        ? "border-wine-900 bg-wine-900 text-ivory-50"
                        : "border-wine-900/25 bg-white text-wine-900/35"
                  }`}
                >
                  {step.state === "done"
                    ? "✓"
                    : step.state === "current"
                      ? "●"
                      : "○"}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className={`h-7 w-px ${
                      steps[index + 1].state === "done" ||
                      step.state === "done"
                        ? "bg-emerald-400"
                        : "bg-wine-900/15"
                    }`}
                  />
                ) : null}
              </div>
              <span
                className={`pt-1 text-sm ${
                  step.state === "todo" ? "text-wine-900/45" : "text-wine-900"
                }`}
              >
                {step.label}
                <span className="sr-only">
                  {step.state === "done"
                    ? " (completed)"
                    : step.state === "current"
                      ? " (in progress)"
                      : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {shipment ? (
        <section className="mt-4 rounded-2xl border border-wine-900/10 bg-white/70 p-5 text-sm text-wine-900/80">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Courier
          </h2>
          <p className="mt-2">
            {shipment.courier} · Tracking ID{" "}
            <span className="font-medium text-wine-900">
              {shipment.tracking_id}
            </span>
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

      <p className="mt-6 text-xs text-wine-900/50">
        Questions about this order?{" "}
        <Link
          href={`/order/${view.order_number}`}
          className="underline underline-offset-2 hover:text-wine-900"
        >
          View your order details
        </Link>
        .
      </p>
    </>
  );
}
