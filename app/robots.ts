import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/**
 * robots.txt (Phase 11 SEO): the storefront is crawlable; staff areas,
 * accounts and APIs are not. /order/<number> and /track-order answers are
 * credential-gated per order — excluded so nobody's order IDs land in an
 * index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/client/", "/admin/", "/account/", "/api/", "/order/"],
      },
    ],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
