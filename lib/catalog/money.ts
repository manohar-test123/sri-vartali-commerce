/**
 * Money helpers (spec §15C, rule 7).
 *
 * Paise integers are the only representation that touches the database;
 * rupees exist solely at the UI edge. Parsing is string-based end to end —
 * no float arithmetic, ever.
 */

/** "5,999" | "₹5999.50" | " 5999 " → 599900 / 599950 paise; invalid → null. */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const [whole, fraction = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0") || "0");
  return Number.isSafeInteger(paise) ? paise : null;
}

/** 599900 → "₹5,999"; 599950 → "₹5,999.50". Non-paise-safe input → "₹0". */
export function formatPaise(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) return "₹0";
  const whole = Math.floor(paise / 100);
  const cents = paise % 100;
  const rupees = whole.toLocaleString("en-IN");
  return cents === 0 ? `₹${rupees}` : `₹${rupees}.${String(cents).padStart(2, "0")}`;
}

/** Integer discount percent shown in the wizard; null when not a discount. */
export function discountPercent(
  mrpPaise: number | null,
  sellingPaise: number,
): number | null {
  if (mrpPaise === null || sellingPaise <= 0 || mrpPaise <= sellingPaise) {
    return null;
  }
  return Math.floor(((mrpPaise - sellingPaise) / mrpPaise) * 100);
}
