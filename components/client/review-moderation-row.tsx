"use client";

/**
 * One moderation row on /client/reviews (§8): approve to publish on the
 * product page, hide back to pending, or delete outright. Every change
 * lands in audit_logs.
 */

import { useState, useTransition } from "react";

import {
  deleteReviewAction,
  setReviewApprovalAction,
} from "@/lib/reviews/actions";
import type { ModerationReview } from "@/lib/reviews/queries";

export function ReviewModerationRow({ review }: { review: ModerationReview }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const placed = new Date(review.created_at).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok && result.error) setError(result.error);
    });
  }

  return (
    <li className="rounded-xl border border-wine-900/15 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-wine-900">
            <span aria-hidden className="text-gold-600">
              {"★".repeat(review.rating)}
              <span className="text-wine-900/20">
                {"★".repeat(5 - review.rating)}
              </span>
            </span>
            <strong className="font-medium">{review.product_name}</strong>
            <code className="rounded bg-gold-50 px-1.5 py-0.5 text-xs text-wine-900/70">
              {review.product_code}
            </code>
          </p>
          {review.title ? (
            <p className="mt-1.5 text-sm font-medium text-wine-900">
              {review.title}
            </p>
          ) : null}
          {review.body ? (
            <p className="mt-1 text-sm leading-6 text-wine-900/75">
              {review.body}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-wine-900/40">
            {review.customer_name ?? "Verified buyer"} · {placed}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {review.is_approved ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => setReviewApprovalAction(review.id, false))
              }
              className="rounded-full border border-wine-900/30 px-4 py-1.5 text-xs font-medium text-wine-900 transition-colors hover:bg-ivory-100 disabled:opacity-50"
            >
              Hide
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => setReviewApprovalAction(review.id, true))
              }
              className="rounded-full bg-wine-900 px-4 py-1.5 text-xs font-medium text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {confirmingDelete ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteReviewAction(review.id))}
                className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Delete for real
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingDelete(false)}
                className="text-xs text-wine-900/60 underline underline-offset-2"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </li>
  );
}
