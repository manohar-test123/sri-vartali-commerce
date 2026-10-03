import { createAdminClient } from "@/lib/db/admin";

/** Moderation list row (§8 /client/reviews). */
export interface ModerationReview {
  id: string;
  product_id: string;
  product_slug: string;
  product_code: string;
  product_name: string;
  customer_name: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_approved: boolean;
  created_at: string;
}

export type ModerationFilter = "pending" | "approved" | "all";

export async function listReviewsForModeration(
  filter: ModerationFilter = "pending",
): Promise<ModerationReview[]> {
  const admin = createAdminClient();
  let query = admin
    .from("reviews")
    .select(
      `id, product_id, customer_name, rating, title, body, is_approved,
       created_at, products (slug, product_code, name)`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "pending") query = query.eq("is_approved", false);
  if (filter === "approved") query = query.eq("is_approved", true);

  const { data, error } = await query;
  if (error) throw new Error(`reviews list: ${error.message}`);

  return (data ?? []).map((raw) => {
    const r = raw as unknown as {
      id: string;
      product_id: string;
      customer_name: string | null;
      rating: number;
      title: string | null;
      body: string | null;
      is_approved: boolean;
      created_at: string;
      products: { slug: string; product_code: string; name: string } | null;
    };
    return {
      id: r.id,
      product_id: r.product_id,
      product_slug: r.products?.slug ?? "",
      product_code: r.products?.product_code ?? "—",
      product_name: r.products?.name ?? "Unknown product",
      customer_name: r.customer_name,
      rating: r.rating,
      title: r.title,
      body: r.body,
      is_approved: r.is_approved,
      created_at: r.created_at,
    };
  });
}
