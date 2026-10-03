import type { Metadata } from "next";

import { ReviewModerationRow } from "@/components/client/review-moderation-row";
import { listReviewsForModeration, type ModerationFilter } from "@/lib/reviews/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reviews · Sri Vartali" };

/**
 * Review moderation (spec §8 /client/reviews). Submissions from product
 * pages arrive unapproved; only approved reviews are public (RLS
 * reviews_select), so this queue is the publication gate.
 */
export default async function ClientReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const active: ModerationFilter = (
    ["pending", "approved", "all"] as const
  ).includes(filter as ModerationFilter)
    ? (filter as ModerationFilter)
    : "pending";

  const reviews = await listReviewsForModeration(active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Reviews</p>
      <h1 className="mt-1 font-serif text-3xl text-wine-900">Reviews</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-wine-900/60">
        Customers review a product from its page using their order ID and
        phone. Nothing is public until you approve it.
      </p>

      <nav aria-label="Filter reviews" className="mt-6 flex flex-wrap gap-2 text-sm">
        {(
          [
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["all", "All"],
          ] as const
        ).map(([value, label]) => (
          <a
            key={value}
            href={value === "pending" ? "/client/reviews" : `/client/reviews?filter=${value}`}
            aria-current={active === value ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 transition-colors ${
              active === value
                ? "border-wine-900 bg-wine-900 text-ivory-50"
                : "border-wine-900/20 bg-white text-wine-900/70 hover:border-wine-900/40"
            }`}
          >
            {label}
          </a>
        ))}
      </nav>

      {reviews.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-wine-900/25 px-6 py-12 text-center text-sm text-wine-900/50">
          {active === "pending"
            ? "No reviews waiting. New submissions from product pages land here."
            : "Nothing here yet."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {reviews.map((review) => (
            <ReviewModerationRow key={review.id} review={review} />
          ))}
        </ul>
      )}
    </div>
  );
}
