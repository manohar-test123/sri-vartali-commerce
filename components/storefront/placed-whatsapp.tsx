"use client";

/**
 * §2 flow: after placement, open the customer's WhatsApp with the
 * prefilled §27 order message. Rendered only on /order/<n>?placed=1 when
 * a store WhatsApp number is configured; the green button beside it is
 * the always-works fallback (deep links prefill, the customer sends).
 */

import { useEffect, useState } from "react";

export function PlacedWhatsAppAuto({ whatsappUrl }: { whatsappUrl: string }) {
  const [armed, setArmed] = useState(true);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => {
      window.location.assign(whatsappUrl);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [armed, whatsappUrl]);

  return (
    <button
      type="button"
      className="mt-3 inline-block rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
      onClick={() => {
        setArmed(false);
        window.location.assign(whatsappUrl);
      }}
    >
      Send order on WhatsApp
    </button>
  );
}
