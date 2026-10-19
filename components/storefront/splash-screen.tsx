"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  SPLASH_DURATION_MS,
  SPLASH_FADE_MS,
  SPLASH_STORAGE_KEY,
  shouldShowSplash,
  splashRedirectPath,
} from "@/lib/storefront/splash";

/**
 * Phase 20 splash: the brand medallion holds for two seconds on the first
 * storefront entry of a browser session, fades out smoothly, and lands the
 * user on the homepage (per spec — users already there stay put).
 *
 * First-paint correctness: the overlay is server-rendered visible, and the
 * layout ships a tiny pre-paint script + <noscript> override that hides it
 * for returning sessions, reduced-motion users, and JavaScript-less
 * visits — so the store behaves exactly as before in every other case.
 */
export function SplashScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"holding" | "fading" | "done">(
    "holding",
  );

  useEffect(() => {
    const show = shouldShowSplash({
      alreadyShown: sessionStorage.getItem(SPLASH_STORAGE_KEY) !== null,
      prefersReducedMotion: window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches,
    });
    // Returning sessions are already hidden pre-paint by the layout's
    // script; this unhooks the timers so the splash never plays. The
    // setState rides a macrotask (lint: no synchronous setState in effects).
    if (!show) {
      const hide = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(hide);
    }

    const fade = setTimeout(() => setPhase("fading"), SPLASH_DURATION_MS);
    const finish = setTimeout(() => {
      sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
      setPhase("done");
      const redirect = splashRedirectPath(pathname);
      if (redirect !== null) router.replace(redirect);
    }, SPLASH_DURATION_MS + SPLASH_FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(finish);
    };
    // pathname is read fresh at completion; the effect itself runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden
      className={`splash-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center bg-wine-950 transition-opacity ease-out ${
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${SPLASH_FADE_MS}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo.svg"
        alt=""
        width={112}
        height={112}
        className="h-28 w-28 rounded-2xl shadow-2xl"
      />
      <p className="mt-6 font-serif text-2xl tracking-wide text-gold-200">
        Sri Vartali Sarees
      </p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-ivory-100/50">
        Handpicked weaves
      </p>
    </div>
  );
}
