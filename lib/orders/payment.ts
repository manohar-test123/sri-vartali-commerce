/**
 * Optional UTR / reference for manual payment verification (§32) — pure.
 *
 * Bank reference formats vary (UPI UTRs are 12 digits, NEFT/IMPS refs are
 * alphanumeric), so the contract is deliberately loose: trimmed, 4-40 chars
 * of letters, digits or hyphens. Blank stays blank — the field is optional
 * and an empty reference must never block a verification.
 */

export type UtrResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

const UTR_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

export function normalizeUtrReference(input: string): UtrResult {
  const value = input.trim();
  if (value === "") return { ok: true, value: null };
  if (!UTR_PATTERN.test(value)) {
    return {
      ok: false,
      error: "UTR / reference must be 4-40 letters, digits or hyphens.",
    };
  }
  return { ok: true, value };
}
