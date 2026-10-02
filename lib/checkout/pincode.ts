/**
 * PIN code lookup (spec §21): 6-digit format check, then a lookup that
 * autofills State + District and offers matching Locality/Post Office
 * options. One PIN never determines a full address — the customer picks
 * the post office and types house/street/area themselves.
 *
 * Source: api.postalpincode.in (India Post data, free, no key). The lookup
 * is best-effort: when the service is unreachable or a PIN is unknown, the
 * caller gets `ok: false` and the checkout stays open with manual entry —
 * no invented addresses, no blocked checkout.
 */

import { PIN_PATTERN } from "@/lib/checkout/address";

export interface PinLookup {
  pin: string;
  state: string | null;
  district: string | null;
  /** Post office / locality names for this PIN, deduped, order preserved. */
  postOffices: string[];
}

export interface PinLookupResult {
  ok: boolean;
  /** "invalid" (bad format) | "not_found" | "unavailable" (service down) */
  reason?: "invalid" | "not_found" | "unavailable";
  lookup?: PinLookup;
}

/** Raw api.postalpincode.in envelope — only the fields we read. */
export interface PostalPincodeEnvelope {
  Message?: string;
  Status?: string;
  PostOffice?: Array<{
    Name?: string;
    District?: string;
    State?: string;
    Block?: string;
  }> | null;
}

/** Raw api.postalpincode.in payload — the envelope arrives wrapped in an array. */
export type PostalPincodePayload = PostalPincodeEnvelope | PostalPincodeEnvelope[];

/**
 * Unwrap the API's array wrapper to the single envelope it always carries.
 * Exported for tests.
 */
export function unwrapPostalPayload(
  payload: PostalPincodePayload,
): PostalPincodeEnvelope {
  return Array.isArray(payload) ? (payload[0] ?? {}) : payload;
}
/** Map a raw API payload to the §21 lookup shape. Exported for tests. */
export function mapPostalPincodeResponse(
  pin: string,
  payload: PostalPincodeEnvelope,
): PinLookupResult {
  if (payload.Status !== "Success" || !Array.isArray(payload.PostOffice)) {
    return { ok: false, reason: "not_found" };
  }

  const postOffices: string[] = [];
  for (const po of payload.PostOffice) {
    const name = po.Name?.trim();
    if (name && !postOffices.includes(name)) postOffices.push(name);
  }

  const first = payload.PostOffice[0] ?? {};
  return {
    ok: true,
    lookup: {
      pin,
      state: first.State?.trim() || null,
      district: first.District?.trim() || null,
      postOffices,
    },
  };
}

const LOOKUP_TIMEOUT_MS = 6000;
const cache = new Map<string, PinLookupResult>();

export async function lookupPinCode(rawPin: string): Promise<PinLookupResult> {
  const pin = rawPin.trim();
  if (!PIN_PATTERN.test(pin)) {
    return { ok: false, reason: "invalid" };
  }

  const cached = cache.get(pin);
  if (cached) return cached;

  let result: PinLookupResult;
  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`,
      { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = unwrapPostalPayload(
      (await response.json()) as PostalPincodePayload,
    );
    result = mapPostalPincodeResponse(pin, payload);
  } catch {
    // Network/timeout/parse failure — never block checkout on the lookup.
    result = { ok: false, reason: "unavailable" };
  }

  if (cache.size > 2000) cache.clear();
  cache.set(pin, result);
  return result;
}
