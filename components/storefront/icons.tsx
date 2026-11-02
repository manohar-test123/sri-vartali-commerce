/**
 * Storefront icon set — one stroked 24px grid, one visual weight (1.6px
 * rounded strokes, currentColor) so every header action reads as a family:
 * search, wishlist heart, account person, cart bag. Mirrors the contact
 * dock's WhatsApp/phone glyphs.
 */

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M12 20s-7.5-4.6-7.5-10a4.4 4.4 0 0 1 7.5-3.1A4.4 4.4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
    </svg>
  );
}

export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.8-3.5 3.6-5.4 7-5.4s6.2 1.9 7 5.4" />
    </svg>
  );
}

/** Boutique bag glyph — the cart marker since Phase 19. */
export function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M6.5 7.5h11l-.9 12a1.8 1.8 0 0 1-1.8 1.6H9.2a1.8 1.8 0 0 1-1.8-1.6l-.9-12Z" />
      <path d="M9 10V6.2a3 3 0 0 1 6 0V10" />
    </svg>
  );
}
