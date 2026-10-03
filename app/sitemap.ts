import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import {
  listPublishedProducts,
  listStorefrontCategories,
  listStorefrontCollections,
} from "@/lib/storefront/queries";

/**
 * Sitemap (spec §46-adjacent SEO hardening, Phase 11): public routes plus
 * every published product, active category and active collection. Staff
 * areas (/client, /admin, /account) are deliberately absent — robots.ts
 * disallows them too. When Supabase is unconfigured (CI build) the static
 * routes still ship.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/shop",
    "/new-arrivals",
    "/best-sellers",
    "/search",
    "/track-order",
    "/cart",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" || path === "/new-arrivals" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const [products, categories, collections] = await Promise.all([
      listPublishedProducts(),
      listStorefrontCategories(),
      listStorefrontCollections(),
    ]);

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${base}/category/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    const collectionRoutes: MetadataRoute.Sitemap = collections
      .filter((c) => c.productCount > 0)
      .map((c) => ({
        url: `${base}/collections/${c.slug}`,
        changeFrequency: "weekly",
        priority: 0.6,
      }));

    return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...collectionRoutes];
  } catch {
    return staticRoutes;
  }
}
