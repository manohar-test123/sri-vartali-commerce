"use client";

/**
 * Order action panel (spec §34). Phase 6 actions: cancel (releases the
 * reservation), extend reservation, advance fulfilment (PROCESSING /
 * PACKED). Verify-payment lands with the payments phase; courier /
 * tracking / shipped with the shipping phase — the disabled block keeps
 * the panel shaped like the spec so the additions are drop-ins.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  advanceFulfilmentAction,
  cancelOrderAction,
  extendReservationAction,
} from "@/lib/orders/actions";
import type {
  FulfilmentStatus,
  OrderStatus,
  PaymentStatus,
} from "@/lib/orders/status";
import { canAdvanceFulfilment, canCancel, canExtendReservation } from "@/lib/orders/status";

interface OrderActionsProps {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  reservationExpiresAt: string | null;
}

const buttonBase =
  "rounded-full px-5 py-2 text-sm transition-colors disabled:opacity-50";
const primary = `${buttonBase} bg-wine-900 text-ivory-50 hover:bg-wine-800`;
const secondary = `${buttonBase} border border-wine-900/30 text-wine-900 hover:bg-white`;
const danger = `${buttonBase} border border-red-300 text-red-800 hover:bg-red-50`;

export function OrderActionsPanel({
  orderId,
  orderNumber,
  orderStatus,
  paymentStatus,
  fulfilmentStatus,
  reservationExpiresAt,
}: OrderActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: true; message: string | null } | { ok: false; error: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setMessage(result.message);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const cancellable = canCancel(orderStatus, paymentStatus);
  const extensible = canExtendReservation(orderStatus, paymentStatus, reservationExpiresAt);
  const nextFulfilment: FulfilmentStatus | null = canAdvanceFulfilment(fulfilmentStatus, "PROCESSING")
    ? "PROCESSING"
    : canAdvanceFulfilment(fulfilmentStatus, "PACKED")
      ? "PACKED"
      : null;

  return (
    <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
      <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
        Actions
      </h2>

      {message ? (
        <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {nextFulfilment ? (
          <button
            type="button"
            className={primary}
            disabled={pending}
            onClick={() => run(() => advanceFulfilmentAction(orderId, nextFulfilment))}
          >
            {nextFulfilment === "PROCESSING" ? "Mark processing" : "Mark packed"}
          </button>
        ) : null}
        {extensible ? (
          <button
            type="button"
            className={secondary}
            disabled={pending}
            onClick={() => run(() => extendReservationAction(orderId))}
          >
            Extend reservation +30m
          </button>
        ) : null}
        {cancellable ? (
          <button
            type="button"
            className={danger}
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  `Cancel ${orderNumber}? Its reserved stock is released immediately.`,
                )
              ) {
                run(() => cancelOrderAction(orderId));
              }
            }}
          >
            Cancel order
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-3 border-t border-dashed border-wine-900/20 pt-4 text-sm text-wine-900/50">
        <p>
          <strong className="font-medium text-wine-900/70">Verify payment</strong>{" "}
          — payment verification and refunds arrive with the payments update.
        </p>
        <p>
          <strong className="font-medium text-wine-900/70">Mark shipped</strong>{" "}
          — courier, tracking ID and shipping messages arrive with the
          shipping update.
        </p>
      </div>
    </section>
  );
}
