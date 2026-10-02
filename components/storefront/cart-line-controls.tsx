"use client";

/**
 * Quantity stepper + remove for one /cart line. Calls the cart server
 * actions, then refreshes so the estimate, the line and the header badge
 * all re-render from server state.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { removeItem, setQuantity } from "@/lib/cart/actions";

export function CartLineControls({
  variantId,
  quantity,
  available,
}: {
  variantId: string;
  quantity: number;
  available: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-full border border-wine-900/20 bg-white">
        <button
          type="button"
          aria-label="Decrease quantity"
          className="px-3 py-1 text-wine-900 disabled:opacity-30"
          disabled={pending}
          onClick={() => run(() => setQuantity(variantId, quantity - 1))}
        >
          −
        </button>
        <span className="min-w-7 text-center text-sm text-wine-900" aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          className="px-3 py-1 text-wine-900 disabled:opacity-30"
          disabled={pending || quantity >= available}
          onClick={() => run(() => setQuantity(variantId, quantity + 1))}
        >
          +
        </button>
      </div>
      <button
        type="button"
        className="text-xs text-wine-900/60 underline hover:text-red-700"
        disabled={pending}
        onClick={() => run(() => removeItem(variantId))}
      >
        Remove
      </button>
      <span className="text-[11px] text-wine-900/40">{available} available</span>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
