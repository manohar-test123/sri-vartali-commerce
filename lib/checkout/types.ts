/**
 * Serializable checkout shapes shared between the review Server Action and
 * the client form. The action returns a verified, server-computed quote —
 * the browser never supplies prices or totals (§22).
 */

import type {
  AddressInput,
  AddressErrors,
  ContactErrors,
  ContactInput,
} from "@/lib/checkout/address";
import type { QuoteIssue, QuoteLine, QuoteTotals } from "@/lib/checkout/quote";

export interface VerifiedCheckout {
  lines: QuoteLine[];
  totals: QuoteTotals;
  contact: ContactInput;
  address: AddressInput;
  /** Which source the verified quote came from (§19). */
  mode: "buy-now" | "cart";
}

export type CheckoutReviewResult =
  | { status: "invalid"; contactErrors: ContactErrors; addressErrors: AddressErrors }
  | { status: "issues"; issues: QuoteIssue[] }
  | { status: "verified"; checkout: VerifiedCheckout }
  | { status: "empty" };
