"use client";

/**
 * Checkout form (spec §20, §21): contact + address with PIN lookup
 * (autofill State/District, locality options via datalist), plus the
 * itemized order summary. Submitting runs the server-side review: contact
 * and address are validated, then the quote is rebuilt from fresh catalog
 * rows — the verified panel that appears carries server totals only.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { abandonBuyNow } from "@/lib/cart/actions";
import { reviewCheckout } from "@/lib/checkout/actions";
import { placeOrderAction, type PlaceOrderResult } from "@/lib/orders/actions";
import { formatPaise } from "@/lib/catalog/money";
import type { PinLookup } from "@/lib/checkout/pincode";
import type {
  CheckoutReviewResult,
  VerifiedCheckout,
} from "@/lib/checkout/types";
import type { QuoteIssue, QuoteLine, QuoteTotals } from "@/lib/checkout/quote";

interface CheckoutFormProps {
  lines: QuoteLine[];
  totals: QuoteTotals;
  issues: QuoteIssue[];
  mode: "buy-now" | "cart";
  lineImages: Record<string, string | null>;
}

const inputClass =
  "w-full rounded-lg border border-wine-900/15 bg-white px-3 py-2 text-sm text-wine-900 placeholder:text-wine-900/40 focus:border-gold-500 focus:outline-none";
const labelClass =
  "block text-[11px] uppercase tracking-[0.14em] text-wine-900/50";

export function CheckoutForm({
  lines,
  totals,
  issues,
  mode,
  lineImages,
}: CheckoutFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    fullName: "",
    whatsappPhone: "",
    email: "",
    pinCode: "",
    house: "",
    street: "",
    area: "",
    landmark: "",
    district: "",
    state: "",
    locality: "",
  });
  const [pinLookup, setPinLookup] = useState<{
    status: "idle" | "loading" | "ok" | "failed";
    postOffices: string[];
    message: string | null;
  }>({ status: "idle", postOffices: [], message: null });

  const [errors, setErrors] = useState<{
    contact: Record<string, string>;
    address: Record<string, string>;
  }>({ contact: {}, address: {} });
  const [stockIssues, setStockIssues] = useState<QuoteIssue[] | null>(null);
  const [verified, setVerified] = useState<VerifiedCheckout | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<
    Extract<PlaceOrderResult, { status: "placed" }> | null
  >(null);

  // §2: order first, then WhatsApp opens. Top-level navigation to the
  // wa.me link (not a popup) from the placement gesture's aftermath; the
  // buttons below stay as the always-works fallback.
  useEffect(() => {
    if (placed?.whatsappUrl) {
      const timer = window.setTimeout(() => {
        window.location.assign(placed.whatsappUrl!);
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [placed]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function lookupPin() {
    const pin = form.pinCode.trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setPinLookup({
        status: "failed",
        postOffices: [],
        message: "Enter a valid 6-digit PIN code (no leading zero).",
      });
      return;
    }
    setPinLookup({ status: "loading", postOffices: [], message: null });
    try {
      const response = await fetch(`/api/pin/${pin}`);
      const payload = (await response.json()) as {
        ok: boolean;
        reason?: string;
        lookup?: PinLookup;
      };
      if (payload.ok && payload.lookup) {
        setPinLookup({
          status: "ok",
          postOffices: payload.lookup.postOffices,
          message: null,
        });
        setForm((f) => ({
          ...f,
          state: payload.lookup!.state ?? f.state,
          district: payload.lookup!.district ?? f.district,
        }));
      } else {
        setPinLookup({
          status: "failed",
          postOffices: [],
          message:
            payload.reason === "unavailable"
              ? "PIN service is unavailable right now — please fill district and state manually."
              : "PIN not found — please check the code, or fill district and state manually.",
        });
      }
    } catch {
      setPinLookup({
        status: "failed",
        postOffices: [],
        message: "PIN service is unavailable right now — please fill district and state manually.",
      });
    }
  }

  function submit(data: FormData) {
    setErrors({ contact: {}, address: {} });
    setStockIssues(null);
    setPlaceError(null);
    startTransition(async () => {
      const result: CheckoutReviewResult = await reviewCheckout(data);
      if (result.status === "invalid") {
        setErrors({
          contact: result.contactErrors as Record<string, string>,
          address: result.addressErrors as Record<string, string>,
        });
        return;
      }
      if (result.status === "issues") {
        setStockIssues(result.issues);
        router.refresh(); // summary re-renders with the adjusted quote
        return;
      }
      if (result.status === "empty") {
        router.replace("/cart");
        return;
      }
      setVerified(result.checkout);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /** §22 steps 10-16: create the order, then hand off to WhatsApp (§27). */
  function place(data: FormData) {
    setPlaceError(null);
    setPlacing(true);
    startTransition(async () => {
      let result: PlaceOrderResult;
      try {
        result = await placeOrderAction(data);
      } catch {
        setPlacing(false);
        setPlaceError(
          "Something went wrong while placing your order. Your cart is untouched — please try again.",
        );
        return;
      }
      setPlacing(false);
      if (result.status === "invalid") {
        setVerified(null);
        setErrors({
          contact: result.contactErrors as Record<string, string>,
          address: result.addressErrors as Record<string, string>,
        });
        return;
      }
      if (result.status === "issues") {
        setVerified(null);
        setStockIssues(result.issues);
        router.refresh();
        return;
      }
      if (result.status === "empty") {
        router.replace("/cart");
        return;
      }
      if (result.status === "error") {
        setVerified(null);
        setPlaceError(result.error);
        router.refresh();
        return;
      }
      setPlaced(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-xl">
        <section
          aria-labelledby="placed-heading"
          className="rounded-2xl border border-emerald-600/30 bg-emerald-50/60 p-8 text-center"
        >
          <h2 id="placed-heading" className="font-serif text-3xl text-wine-900">
            Order placed ✓
          </h2>
          <p className="mt-3 text-sm leading-6 text-wine-900/70">
            Your order{" "}
            <strong className="font-semibold">{placed.orderNumber}</strong> is
            confirmed and its items are reserved for you.
          </p>
          {placed.whatsappUrl ? (
            <>
              <p className="mt-2 text-sm text-wine-900/60">
                Opening WhatsApp to send the order… if nothing happens, tap
                below. The message is prefilled — just press send.
              </p>
              <a
                href={placed.whatsappUrl}
                className="mt-6 inline-block rounded-full bg-[#25D366] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
              >
                Open WhatsApp
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm text-wine-900/60">
              Send the order details on WhatsApp from your order page.
            </p>
          )}
          <div>
            <a
              href={placed.orderUrl}
              className="mt-4 inline-block text-sm font-medium text-wine-800 underline decoration-gold-400 underline-offset-4"
            >
              View your order →
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <form
      action={submit}
      className="grid gap-10 lg:grid-cols-[1fr_340px]"
      noValidate
    >
      {/* Stays mounted while verified so the place action receives the
          same FormData the review saw — hidden, not unmounted. */}
      <div className="space-y-8" hidden={verified !== null}>
        {mode === "buy-now" ? (
          <p className="rounded-xl border border-gold-300 bg-gold-100/60 px-4 py-3 text-sm text-wine-900/80">
            Checking out with <strong>Buy Now</strong> — just this item.{" "}
            <button
              type="submit"
              formAction={abandonBuyNow}
              className="font-medium underline"
            >
              Checkout your full cart instead
            </button>
          </p>
        ) : null}

        <fieldset className="space-y-4">
          <legend className="font-serif text-xl text-wine-900">Contact</legend>
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Full name *
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              className={inputClass}
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
            {errors.contact.fullName ? (
              <p className="mt-1 text-xs text-red-700">{errors.contact.fullName}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="whatsappPhone" className={labelClass}>
              WhatsApp number *
            </label>
            <input
              id="whatsappPhone"
              name="whatsappPhone"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              className={inputClass}
              value={form.whatsappPhone}
              onChange={(e) => set("whatsappPhone", e.target.value)}
            />
            {errors.contact.whatsappPhone ? (
              <p className="mt-1 text-xs text-red-700">
                {errors.contact.whatsappPhone}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-wine-900/40">
                Order and payment updates arrive on WhatsApp.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email (optional)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            {errors.contact.email ? (
              <p className="mt-1 text-xs text-red-700">{errors.contact.email}</p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-serif text-xl text-wine-900">
            Delivery address
          </legend>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="pinCode" className={labelClass}>
                PIN code *
              </label>
              <input
                id="pinCode"
                name="pinCode"
                required
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                placeholder="6-digit PIN"
                className={inputClass}
                value={form.pinCode}
                onChange={(e) => {
                  set("pinCode", e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPinLookup({ status: "idle", postOffices: [], message: null });
                }}
              />
            </div>
            <button
              type="button"
              onClick={lookupPin}
              disabled={pinLookup.status === "loading"}
              className="mb-0.5 rounded-full border border-gold-500 px-4 py-2 text-sm text-wine-900 transition-colors hover:bg-gold-100 disabled:opacity-50"
            >
              {pinLookup.status === "loading" ? "Looking up…" : "Find address"}
            </button>
          </div>
          {errors.address.pinCode ? (
            <p className="text-xs text-red-700">{errors.address.pinCode}</p>
          ) : null}
          {pinLookup.message ? (
            <p
              className={`text-xs ${
                pinLookup.status === "ok" ? "text-emerald-700" : "text-red-700"
              }`}
              role="status"
            >
              {pinLookup.message}
            </p>
          ) : null}
          {pinLookup.postOffices.length > 0 ? (
            <datalist id="po-options">
              {pinLookup.postOffices.map((po) => (
                <option key={po} value={po} />
              ))}
            </datalist>
          ) : null}

          <div>
            <label htmlFor="house" className={labelClass}>
              House / flat *
            </label>
            <input
              id="house"
              name="house"
              required
              autoComplete="address-line1"
              className={inputClass}
              value={form.house}
              onChange={(e) => set("house", e.target.value)}
            />
            {errors.address.house ? (
              <p className="mt-1 text-xs text-red-700">{errors.address.house}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="street" className={labelClass}>
              Street *
            </label>
            <input
              id="street"
              name="street"
              required
              autoComplete="address-line2"
              className={inputClass}
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
            />
            {errors.address.street ? (
              <p className="mt-1 text-xs text-red-700">{errors.address.street}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="area" className={labelClass}>
              Area / locality *
            </label>
            <input
              id="area"
              name="area"
              required
              className={inputClass}
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
            />
            {errors.address.area ? (
              <p className="mt-1 text-xs text-red-700">{errors.address.area}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="locality" className={labelClass}>
              Locality / post office
            </label>
            <input
              id="locality"
              name="locality"
              list={pinLookup.postOffices.length > 0 ? "po-options" : undefined}
              placeholder={
                pinLookup.postOffices.length > 0
                  ? "Pick a post office or type your own"
                  : "Optional"
              }
              className={inputClass}
              value={form.locality}
              onChange={(e) => set("locality", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="district" className={labelClass}>
                District
              </label>
              <input
                id="district"
                name="district"
                className={inputClass}
                placeholder="Autofilled by PIN"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="state" className={labelClass}>
                State
              </label>
              <input
                id="state"
                name="state"
                className={inputClass}
                placeholder="Autofilled by PIN"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="landmark" className={labelClass}>
              Landmark
            </label>
            <input
              id="landmark"
              name="landmark"
              className={inputClass}
              placeholder="Optional — helps delivery"
              value={form.landmark}
              onChange={(e) => set("landmark", e.target.value)}
            />
            {errors.address.landmark ? (
              <p className="mt-1 text-xs text-red-700">{errors.address.landmark}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="country" className={labelClass}>
              Country
            </label>
            <input
              id="country"
              name="country"
              readOnly
              value="India"
              className={`${inputClass} bg-wine-900/5 text-wine-900/70`}
            />
          </div>
        </fieldset>

        {stockIssues ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <p className="font-medium">Please review your items:</p>
            <ul className="mt-1 list-inside list-disc text-xs leading-5">
              {stockIssues.map((issue, i) => (
                <li key={`${issue.variantId}-${i}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-wine-900 px-8 py-3 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Verify order"}
          </button>
          <p className="mt-2 text-[11px] text-wine-900/50">
            We re-check live prices and stock and compute totals on the
            server — nothing from this page is trusted.
          </p>
        </div>
      </div>

      {verified ? (
        <section
          aria-labelledby="verified-heading"
          className="h-fit rounded-2xl border border-emerald-600/30 bg-emerald-50/60 p-6"
        >
          <h2 id="verified-heading" className="font-serif text-2xl text-wine-900">
            Order verified ✓
          </h2>
          <p className="mt-2 text-sm leading-6 text-wine-900/70">
            Your items, address and totals were checked and calculated on the
            server. Continue to place the order — we&apos;ll then open WhatsApp
            with your order details prefilled.
          </p>

          <h3 className="mt-6 text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Delivering to
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-wine-900/80">
            {verified.contact.fullName} · +91 {verified.contact.whatsappPhone}
            {verified.contact.email ? ` · ${verified.contact.email}` : ""}
            <br />
            {verified.address.house}, {verified.address.street}
            <br />
            {verified.address.area}
            {verified.address.locality ? `, ${verified.address.locality}` : ""}
            <br />
            {verified.address.district ? `${verified.address.district}, ` : ""}
            {verified.address.state ? `${verified.address.state}, ` : ""}
            {verified.address.pinCode}
            {verified.address.landmark ? ` — Landmark: ${verified.address.landmark}` : ""}
          </p>

          {placeError ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {placeError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              formAction={place}
              disabled={placing || pending}
              className="rounded-full bg-wine-900 px-8 py-3 text-sm font-medium text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
            >
              {placing || pending ? "Placing order…" : "Continue to WhatsApp"}
            </button>
            <button
              type="button"
              className="rounded-full border border-wine-900/30 px-5 py-2 text-sm text-wine-900 hover:bg-white disabled:opacity-50"
              onClick={() => setVerified(null)}
              disabled={placing || pending}
            >
              Edit details
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-wine-900/50">
            Placing reserves your items for 30 minutes while payment is
            confirmed on WhatsApp.
          </p>
        </section>
      ) : null}

      <OrderSummary
        heading={verified ? "Verified total" : "Your order"}
        lines={verified ? verified.lines : lines}
        totals={verified ? verified.totals : totals}
        issues={verified ? undefined : issues}
        lineImages={lineImages}
        note={
          verified
            ? undefined
            : "Estimated from live prices — the verified total appears after you verify."
        }
      />
    </form>
  );
}

function OrderSummary({
  heading,
  lines,
  totals,
  issues,
  lineImages,
  note,
}: {
  heading: string;
  lines: QuoteLine[];
  totals: QuoteTotals;
  issues?: QuoteIssue[];
  lineImages: Record<string, string | null>;
  note?: string;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-wine-900/10 bg-white/70 p-5 lg:sticky lg:top-24">
      <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
        {heading}
      </h2>
      <ul className="mt-3 space-y-3">
        {lines.map((line) => (
          <li key={line.variantId} className="flex items-center gap-3">
            {lineImages[line.variantId] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lineImages[line.variantId]!}
                alt=""
                width={48}
                height={64}
                className="h-16 w-12 rounded-lg border border-wine-900/10 object-cover"
              />
            ) : (
              <div className="h-16 w-12 rounded-lg border border-dashed border-wine-900/20" />
            )}
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-medium text-wine-900">
                {line.productName}
              </p>
              <p className="text-wine-900/50">
                {line.variantName ? `${line.variantName} · ` : ""}×{" "}
                {line.quantity}
              </p>
            </div>
            <span className="text-xs font-semibold text-wine-900">
              {formatPaise(line.lineTotalPaise)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1.5 border-t border-wine-900/10 pt-3 text-sm text-wine-900/80">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatPaise(totals.subtotalPaise)}</dd>
        </div>
        {totals.discountPaise > 0 ? (
          <div className="flex justify-between text-emerald-700">
            <dt>You save (vs MRP)</dt>
            <dd>−{formatPaise(totals.discountPaise)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd>
            {totals.shippingPaise === 0 ? "Free" : formatPaise(totals.shippingPaise)}
          </dd>
        </div>
        <div className="mt-1 flex justify-between border-t border-wine-900/10 pt-2 text-base font-semibold text-wine-900">
          <dt>Total</dt>
          <dd>{formatPaise(totals.totalPaise)}</dd>
        </div>
      </dl>
      {issues && issues.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-red-700">
          {issues.map((issue, i) => (
            <li key={`${issue.variantId}-${i}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
      {note ? (
        <p className="mt-3 text-[11px] leading-4 text-wine-900/50">{note}</p>
      ) : null}
    </aside>
  );
}
