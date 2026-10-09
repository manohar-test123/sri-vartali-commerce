"use client";

/**
 * §39 realtime for the client dashboard: subscribes (with the caller's
 * session — RLS scopes the events) to postgres_changes on public.orders and
 * refreshes the page when a new order lands or payment/fulfilment status
 * moves. Used ONLY on /client pages; storefront pages never subscribe
 * (§39 rule). Degrades silently if realtime can't connect — the dashboard
 * stays correct via normal navigation.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/db/client";
import { describeOrderChange } from "@/lib/orders/realtime";

const TOAST_MS = 6000;

export function OrdersLive() {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return; // unconfigured env — the page shows its setup notice anyway
    }

    const channel = supabase
      .channel("client-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const message = describeOrderChange({
            eventType: payload.eventType,
            old: (payload as { old?: Record<string, unknown> }).old ?? null,
            new: (payload.new ?? null) as Record<string, unknown> | null,
          });
          if (!message) return;
          setToast(message);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setToast(null), TOAST_MS);
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-gold-400 bg-white px-4 py-3 text-sm text-wine-900 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-gold-500" />
        <span className="flex-1">{toast}</span>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => setToast(null)}
          className="rounded-full px-1 leading-none text-wine-900/50 transition-colors hover:text-wine-900"
        >
          ×
        </button>
      </div>
    </div>
  );
}
