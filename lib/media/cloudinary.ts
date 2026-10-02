/**
 * Cloudinary upload signing (spec §13-§14 media, rule 11/13 analog).
 *
 * The browser uploads files straight to Cloudinary with a signature produced
 * server-side — the API secret never reaches the client. Signature spec:
 * sha1 of the params sorted by key, `k=v` joined with `&`, api_secret
 * appended. https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */

import { createHash } from "node:crypto";

export function signCloudinaryParams(
  params: Record<string, string>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret, "utf8").digest("hex");
}

/** Scoped folder for a product's uploads, e.g. svs/products/<product_code>. */
export function productMediaFolder(productCode: string): string {
  return `svs/products/${productCode}`;
}
