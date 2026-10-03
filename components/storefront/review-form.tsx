"use client";

/**
 * Verified-buyer review form (§13 Reviews). The order ID + checkout phone
 * pair is the credential (§37 model) — no account needed. Submissions land
 * unapproved and only appear after the client moderates them at
 * /client/reviews.
 */

import { useActionState, useState } from "react";

import { submitReviewAction, type SubmitReviewResult } from "@/lib/reviews/actions";

interface ReviewFormProps {
  productId: string;
}

const initial: SubmitReviewResult | null = null;

const inputClass =
  "mt-1 w-full rounded-lg border border-wine-900/20 bg-white px-3 py-2.5 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-500 focus:outline-none";

export function ReviewForm({ productId }: ReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    submitReviewAction,
    initial,
  );

  if (state?.status === "submitted") {
    return (
      <p
        role="status"
        className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      >
        Thank you — your review is in and will appear once the store approves
        it.
      </p>
    );
  }

  return (
    <div className="mt-5">
      {open ? (
        <form action={action} className="grid gap-4 rounded-2xl border border-wine-900/10 bg-white/70 p-5 sm:grid-cols-2">
          <input type="hidden" name="productId" value={productId} />

          <fieldset>
            <legend className="text-xs text-wine-900/60">Your rating</legend>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <label key={star} className="cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    value={star}
                    required
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="text-2xl text-wine-900/25 transition-colors peer-checked:text-gold-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold-400 hover:text-gold-500"
                  >
                    ★
                  </span>
                </label>
              ))}
            </div>
            {state?.status === "invalid" && state.errors.rating ? (
              <p className="mt-1 text-xs text-red-700">{state.errors.rating}</p>
            ) : null}
          </fieldset>

          <div>
            <label htmlFor="review-name" className="block text-xs text-wine-900/60">
              Your name (optional)
            </label>
            <input
              id="review-name"
              name="name"
              type="text"
              maxLength={80}
              autoComplete="name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="review-order" className="block text-xs text-wine-900/60">
              Order ID
            </label>
            <input
              id="review-order"
              name="orderNumber"
              type="text"
              required
              autoComplete="off"
              placeholder="SVS-ORD-20261002-00129"
              className={inputClass}
            />
            {state?.status === "invalid" && state.errors.orderNumber ? (
              <p className="mt-1 text-xs text-red-700">{state.errors.orderNumber}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="review-phone" className="block text-xs text-wine-900/60">
              Phone used for the order
            </label>
            <input
              id="review-phone"
              name="phone"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="10-digit WhatsApp number"
              className={inputClass}
            />
            {state?.status === "invalid" && state.errors.phone ? (
              <p className="mt-1 text-xs text-red-700">{state.errors.phone}</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="review-title" className="block text-xs text-wine-900/60">
              Title (optional)
            </label>
            <input
              id="review-title"
              name="title"
              type="text"
              maxLength={80}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="review-body" className="block text-xs text-wine-900/60">
              Your review
            </label>
            <textarea
              id="review-body"
              name="body"
              rows={4}
              maxLength={2000}
              className={inputClass}
            />
          </div>

          {state ? <StatusMessage result={state} /> : null}

          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-wine-900 px-6 py-2.5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Submit review"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-wine-900/60 underline underline-offset-2 hover:text-wine-900"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-wine-900/30 px-5 py-2 text-sm font-medium text-wine-900 transition-colors hover:bg-white"
        >
          Write a review
        </button>
      )}
    </div>
  );
}

function StatusMessage({ result }: { result: SubmitReviewResult }) {
  if (result.status === "invalid") {
    const extras = [result.errors.title, result.errors.body, result.errors.name]
      .filter(Boolean)
      .join(" ");
    if (!extras) return null;
    return (
      <p role="alert" className="text-sm text-red-700 sm:col-span-2">
        {extras}
      </p>
    );
  }
  if (result.status === "error" || result.status === "not_found") {
    return (
      <p role="alert" className="text-sm text-red-700 sm:col-span-2">
        {result.status === "error"
          ? result.error
          : "We could not match that order ID and phone number. Check both and try again."}
      </p>
    );
  }
  if (result.status === "cancelled") {
    return (
      <p role="alert" className="text-sm text-red-700 sm:col-span-2">
        This order was cancelled, so it can no longer be reviewed.
      </p>
    );
  }
  if (result.status === "product_not_in_order") {
    return (
      <p role="alert" className="text-sm text-red-700 sm:col-span-2">
        This product is not part of that order.
      </p>
    );
  }
  if (result.status === "not_shipped_yet") {
    return (
      <p role="alert" className="text-sm text-red-700 sm:col-span-2">
        Reviews open once your order is on its way to you.
      </p>
    );
  }
  if (result.status === "already_reviewed") {
    return (
      <p role="alert" className="text-sm text-red-700 sm:col-span-2">
        You have already reviewed this product from that order — thank you!
      </p>
    );
  }
  return null;
}
