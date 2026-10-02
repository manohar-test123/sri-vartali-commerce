"use client";

/**
 * §13 delivery PIN checker. v1 validates the PIN format (6 digits, no
 * leading zero — Indian postal rules) and shows the dispatch estimate from
 * the product's dispatch_time_days. The full §21 lookup (state/district
 * autofill + post-office options) lives at checkout; until a courier
 * integration arrives, the copy makes no invented promises.
 */

import { useState } from "react";

const PIN_PATTERN = /^[1-9][0-9]{5}$/;

export function PinChecker({ dispatchTimeDays }: { dispatchTimeDays: number }) {
  const [pin, setPin] = useState("");
  const [state, setState] = useState<"idle" | "invalid" | "ok">("idle");

  function check() {
    setState(PIN_PATTERN.test(pin.trim()) ? "ok" : "invalid");
  }

  return (
    <div className="rounded-xl border border-wine-900/10 bg-white/60 p-4">
      <label
        htmlFor="pin"
        className="block text-[11px] uppercase tracking-[0.14em] text-wine-900/50"
      >
        Delivery PIN checker
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="pin"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
            setState("idle");
          }}
          placeholder="6-digit PIN"
          className="w-32 rounded-lg border border-wine-900/15 bg-white px-3 py-1.5 text-sm focus:border-gold-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={check}
          className="rounded-full border border-gold-500 px-4 py-1.5 text-sm text-wine-900 transition-colors hover:bg-gold-100"
        >
          Check
        </button>
      </div>
      {state === "invalid" ? (
        <p className="mt-2 text-xs text-red-700">
          Enter a valid 6-digit PIN code (no leading zero).
        </p>
      ) : null}
      {state === "ok" ? (
        <p className="mt-2 text-xs leading-relaxed text-wine-900/70">
          PIN {pin} accepted. Dispatch in {dispatchTimeDays}{" "}
          {dispatchTimeDays === 1 ? "day" : "days"} after order confirmation,
          then 3–5 days in transit. We confirm serviceability with you over
          WhatsApp at checkout.
        </p>
      ) : null}
    </div>
  );
}
