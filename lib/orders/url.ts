import { headers } from "next/headers";

import { env } from "@/lib/env";

/**
 * Absolute /order/<number> URL from the serving host (§27 Order Link).
 * Server-only — reads request headers; falls back to NEXT_PUBLIC_SITE_URL.
 */
export async function absoluteOrderUrl(orderNumber: string): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (host) {
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}/order/${orderNumber}`;
  }
  return `${env.siteUrl}/order/${orderNumber}`;
}
