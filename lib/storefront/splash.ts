/**
 * Splash screen (Phase 20): the brand medallion holds for two seconds on
 * site entry, then fades out. Pure decisions live here so the behaviour is
 * unit-tested; the component only renders and times.
 *
 * Once per browser session (sessionStorage), never for reduced-motion
 * users, and never without JavaScript (the layout ships a <noscript>
 * override that hides the overlay).
 */

/** sessionStorage flag written once the splash has played. */
export const SPLASH_STORAGE_KEY = "sv-splash-played";

/** How long the medallion holds before the fade starts (ms). */
export const SPLASH_DURATION_MS = 2000;

/** Fade-out length (ms) — the "smooth, professional transition". */
export const SPLASH_FADE_MS = 600;

export interface SplashDecision {
  alreadyShown: boolean;
  prefersReducedMotion: boolean;
}

/** Show the splash only on a session's first storefront entry, and never
 *  for users who asked for reduced motion. */
export function shouldShowSplash(decision: SplashDecision): boolean {
  return !decision.alreadyShown && !decision.prefersReducedMotion;
}

/**
 * Where the user lands after the splash: the homepage per spec — users
 * already on it stay put (no redundant navigation).
 */
export function splashRedirectPath(pathname: string): string | null {
  return pathname === "/" ? null : "/";
}
