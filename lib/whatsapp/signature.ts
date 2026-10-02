/**
 * Meta webhook signature verification (spec §46, §54 error handling).
 *
 * Meta signs every delivery as `X-Hub-Signature-256: sha256=<hex HMAC of the
 * RAW request body>` with the app secret. Compare timing-safely; the caller
 * decides policy when the secret itself is unset (local dev).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;
  const provided = Buffer.from(signatureHeader.slice(prefix.length), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8")
    .digest();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
