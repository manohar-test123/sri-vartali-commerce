"use client";

/**
 * §13 / §18 / §19 purchase block: variant pick, quantity, Add to Cart and
 * Buy Now. All pricing and stock shown here is display-only; the server
 * actions re-validate everything before anything is stored (§22).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addToCart, buyNow } from "@/lib/cart/actions";

export interface AddableVariant {
  id: string;
  sku: string;
  name: string | null;
  priceLabel: string;
  available: number;
}

export function AddToCart({ variants }: { variants: AddableVariant[] }) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const selectable = variants.filter((v) => v.available > 0);
  const selected = variants.find((v) => v.id === variantId) ?? null;
  const maxQty = selected ? selected.available : 0;
  const soldOut = selectable.length === 0;

  function pick(id: string) {
    setVariantId(id);
    setQuantity(1);
    setFeedback(null);
  }

  function handleAdd() {
    setFeedback(null);
    startTransition(async () => {
      const result = await addToCart(variantId, quantity);
      if (result.ok) {
        setFeedback({ kind: "ok", text: "Added to your cart." });
        router.refresh(); // header badge + cart page pick up the new count
      } else {
        setFeedback({ kind: "error", text: result.error });
      }
    });
  }

  function handleBuyNow() {
    setFeedback(null);
    startTransition(async () => {
      try {
        await buyNow(variantId, quantity); // redirects to /checkout on success
      } catch (error) {
        setFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "Buy Now failed.",
        });
      }
    });
  }

  return (
    <section aria-label="Order" className="mt-6">
      {variants.length > 1 ? (
        <>
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Choose option
          </h2>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Variant">
            {variants.map((v) => {
              const disabled = v.available === 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === variantId}
                  disabled={disabled}
                  onClick={() => pick(v.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    v.id === variantId
                      ? "border-wine-900 bg-wine-900 text-ivory-50"
                      : "border-wine-900/20 bg-white text-wine-900 hover:border-wine-900/50"
                  } ${disabled ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                  title={disabled ? "Sold out" : `${v.priceLabel} · ${v.available} available`}
                >
                  {v.name || v.sku}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {!soldOut ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-wine-900/20 bg-white">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="px-3 py-1.5 text-wine-900 disabled:opacity-30"
              disabled={quantity <= 1 || pending}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm text-wine-900" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="px-3 py-1.5 text-wine-900 disabled:opacity-30"
              disabled={quantity >= maxQty || pending}
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>
          <span className="text-[11px] text-wine-900/50">
            {maxQty} available
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={soldOut || pending}
          onClick={handleAdd}
          className="rounded-full border border-wine-900 px-6 py-2.5 text-sm font-medium text-wine-900 transition-colors hover:bg-wine-900 hover:text-ivory-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add to Cart"}
        </button>
        <button
          type="button"
          disabled={soldOut || pending}
          onClick={handleBuyNow}
          className="rounded-full bg-gold-500 px-6 py-2.5 text-sm font-semibold text-wine-900 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Buy Now
        </button>
      </div>

      {feedback ? (
        <p
          role="status"
          className={`mt-3 text-sm ${
            feedback.kind === "ok" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {feedback.text}
          {feedback.kind === "ok" ? (
            <>
              {" "}
              <Link href="/cart" className="font-medium underline">
                View cart
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
