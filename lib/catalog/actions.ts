"use server";

/**
 * Catalog mutations for the client CMS (spec §14-§17).
 *
 * Server Actions carrying the caller's session — RLS is the enforcement
 * layer (rule 21); the role guard here is defense in depth. Money arrives
 * as paise integers only (rule 7/14 analog: nothing price-shaped is trusted
 * from the browser beyond validation).
 */

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { compactValues, validateValues } from "@/lib/catalog/attributes";
import { parseSchema } from "@/lib/catalog/attributes";
import { defaultVariantSku, variantSku } from "@/lib/catalog/sku";
import { uniqueSlug } from "@/lib/catalog/slug";
import { createClient as createServerClient } from "@/lib/db/server";
import type { AttributeValues } from "@/lib/catalog/types";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

async function requireClientRole(): Promise<void> {
  const session = await getSession();
  if (session.status !== "authenticated") {
    throw new Error("Sign in required.");
  }
  if (
    session.user.role !== "CLIENT_OWNER" &&
    session.user.role !== "CLIENT_STAFF" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    throw new Error("Client role required for catalog management.");
  }
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

async function categorySchemaFor(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  categoryId: string,
): Promise<unknown> {
  const { data: category } = await supabase
    .from("categories")
    .select("id, parent_id, attribute_schema")
    .eq("id", categoryId)
    .single();
  if (!category) return [];
  const own = parseSchema(category.attribute_schema);
  if (own.length > 0) return own;
  if (category.parent_id) {
    const { data: parent } = await supabase
      .from("categories")
      .select("attribute_schema")
      .eq("id", category.parent_id)
      .single();
    return parent?.attribute_schema ?? [];
  }
  return [];
}

/* ── create / update ─────────────────────────────────────────────────── */

export async function createDraft(input: {
  name: string;
  categoryId: string;
  sellingPricePaise: number;
  mrpPaise?: number | null;
  shortDescription?: string;
}): Promise<ActionResult<{ id: string; productCode: string; slug: string }>> {
  await requireClientRole();
  const name = input.name.trim();
  if (name === "") return fail("Product name is required.");
  if (!Number.isSafeInteger(input.sellingPricePaise) || input.sellingPricePaise <= 0) {
    return fail("Selling price must be a positive amount.");
  }

  const supabase = await createServerClient();

  // Unique slug: fetch existing slugs sharing the root to seed the check.
  const root = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .ilike("slug", `${root}%`);
  const slug = uniqueSlug(name, (existing ?? []).map((r) => r.slug));

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      category_id: input.categoryId,
      selling_price_paise: input.sellingPricePaise,
      mrp_paise: input.mrpPaise ?? null,
      short_description: input.shortDescription?.trim() || null,
      status: "DRAFT",
    })
    .select("id, product_code, slug")
    .single();
  if (error || !product) return fail(`Could not create draft: ${error.message}`);

  // Invariant (§3): every product has ≥ 1 variant — a fresh product gets
  // its DEFAULT variant with its own inventory row.
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: product.id,
      sku: defaultVariantSku(product.product_code),
      name: null,
    })
    .select("id")
    .single();
  if (variantError || !variant) {
    await supabase.from("products").delete().eq("id", product.id);
    return fail(`Could not create default variant: ${variantError.message}`);
  }

  const { error: inventoryError } = await supabase.from("inventory").insert({
    product_id: product.id,
    variant_id: variant.id,
    quantity: 0,
    low_stock_threshold: 2,
  });
  if (inventoryError) {
    await supabase.from("products").delete().eq("id", product.id);
    return fail(`Could not create inventory row: ${inventoryError.message}`);
  }

  revalidatePath("/client/products");
  return { ok: true, data: { id: product.id, productCode: product.product_code, slug: product.slug } };
}

export async function updateProduct(
  productId: string,
  patch: {
    name?: string;
    shortDescription?: string | null;
    description?: string | null;
    sellingPricePaise?: number;
    mrpPaise?: number | null;
    attributeValues?: Record<string, unknown>;
    categoryId?: string;
    careInstructions?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    weightG?: number | null;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
    dispatchTimeDays?: number;
    returnEligible?: boolean;
    shippingNotes?: string | null;
  },
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();

  const { data: current } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (!current) return fail("Product not found.");
  if (current.status === "ARCHIVED") {
    return fail("This product is archived — restore it before editing.");
  }

  const update: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name === "") return fail("Product name cannot be empty.");
    update.name = name;
  }
  if (patch.shortDescription !== undefined) {
    update.short_description = patch.shortDescription?.trim() || null;
  }
  if (patch.description !== undefined) {
    update.description = patch.description ?? null;
  }
  if (patch.sellingPricePaise !== undefined) {
    if (
      !Number.isSafeInteger(patch.sellingPricePaise) ||
      patch.sellingPricePaise <= 0
    ) {
      return fail("Selling price must be a positive amount.");
    }
    update.selling_price_paise = patch.sellingPricePaise;
  }
  if (patch.mrpPaise !== undefined) {
    update.mrp_paise = patch.mrpPaise;
  }
  if (patch.categoryId !== undefined && patch.categoryId !== current.category_id) {
    update.category_id = patch.categoryId;
  }
  if (patch.attributeValues !== undefined) {
    const categoryId = (update.category_id as string) ?? current.category_id;
    const schema = parseSchema(await categorySchemaFor(supabase, categoryId));
    // The product column owns care instructions; keep it out of the jsonb.
    const editorSchema = schema.filter((f) => f.key !== "care_instructions");
    const { values, errors } = validateValues(editorSchema, patch.attributeValues);
    if (Object.keys(errors).length > 0) {
      return fail(Object.values(errors).join(" · "));
    }
    update.attributes = compactValues(values as AttributeValues);
  }
  if (patch.careInstructions !== undefined) {
    update.care_instructions = patch.careInstructions?.trim() || null;
  }
  if (patch.seoTitle !== undefined) update.seo_title = patch.seoTitle?.trim() || null;
  if (patch.seoDescription !== undefined) {
    update.seo_description = patch.seoDescription?.trim() || null;
  }
  if (patch.weightG !== undefined) update.weight_g = patch.weightG;
  if (patch.lengthCm !== undefined) update.length_cm = patch.lengthCm;
  if (patch.widthCm !== undefined) update.width_cm = patch.widthCm;
  if (patch.heightCm !== undefined) update.height_cm = patch.heightCm;
  if (patch.dispatchTimeDays !== undefined) {
    if (!Number.isInteger(patch.dispatchTimeDays) || patch.dispatchTimeDays < 0) {
      return fail("Dispatch time must be zero or more days.");
    }
    update.dispatch_time_days = patch.dispatchTimeDays;
  }
  if (patch.returnEligible !== undefined) update.return_eligible = patch.returnEligible;
  if (patch.shippingNotes !== undefined) {
    update.shipping_notes = patch.shippingNotes?.trim() || null;
  }

  // The wizard autosaves the whole form; prune fields whose values did not
  // change so the touch_updated_at trigger only fires on real edits —
  // otherwise updated_at (and the product list ordering) drifts on idle
  // saves. Objects (attributes) compare via stable JSON of compacted values.
  const currentRow = current as unknown as Record<string, unknown>;
  const unchanged = (key: string, value: unknown): boolean =>
    value === currentRow[key] ||
    (value !== null &&
      currentRow[key] !== null &&
      typeof value === "object" &&
      typeof currentRow[key] === "object" &&
      JSON.stringify(value) === JSON.stringify(currentRow[key]));
  for (const key of Object.keys(update)) {
    if (unchanged(key, update[key])) delete update[key];
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("products").update(update).eq("id", productId);
  if (error) {
    if (error.code === "23514") {
      return fail("Check failed: MRP must be ≥ selling price.");
    }
    return fail(`Could not save: ${error.message}`);
  }

  revalidatePath(`/client/products/${productId}`);
  revalidatePath("/client/products");
  return { ok: true };
}

/* ── status (§16) ────────────────────────────────────────────────────── */

export async function setProductStatus(
  productId: string,
  action: "publish" | "unpublish" | "archive" | "restore",
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();

  const { data: current } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .single();
  if (!current) return fail("Product not found.");

  const from = current.status;
  const allowed =
    (action === "publish" && from === "DRAFT") ||
    (action === "unpublish" && from === "PUBLISHED") ||
    (action === "archive" && (from === "DRAFT" || from === "PUBLISHED")) ||
    (action === "restore" && from === "ARCHIVED");
  if (!allowed) {
    return fail(`Cannot ${action} a ${from.toLowerCase()} product.`);
  }

  const update =
    action === "publish"
      ? { status: "PUBLISHED", published_at: new Date().toISOString() }
      : action === "unpublish"
        ? { status: "DRAFT" }
        : action === "archive"
          ? { status: "ARCHIVED" }
          : { status: "DRAFT" };

  const { error } = await supabase.from("products").update(update).eq("id", productId);
  if (error) return fail(`Could not update status: ${error.message}`);

  revalidatePath(`/client/products/${productId}`);
  revalidatePath("/client/products");
  return { ok: true };
}

/* ── duplicate (§17) ─────────────────────────────────────────────────── */

export async function duplicateProduct(
  productId: string,
  copyImages: boolean,
): Promise<ActionResult<{ id: string }>> {
  await requireClientRole();
  const supabase = await createServerClient();

  const { data: source } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (!source) return fail("Product not found.");

  const name = `${source.name} (copy)`;
  const root = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .ilike("slug", `${root}%`);
  const slug = uniqueSlug(name, (existing ?? []).map((r) => r.slug));

  // §17: copy descriptions, category, attributes, care, shipping, pricing.
  // New product ID, SKU, slug; stock zero; images only when asked.
  const { data: copy, error } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      category_id: source.category_id,
      short_description: source.short_description,
      description: source.description,
      selling_price_paise: source.selling_price_paise,
      mrp_paise: source.mrp_paise,
      attributes: source.attributes,
      care_instructions: source.care_instructions,
      seo_title: source.seo_title,
      seo_description: source.seo_description,
      weight_g: source.weight_g,
      length_cm: source.length_cm,
      width_cm: source.width_cm,
      height_cm: source.height_cm,
      dispatch_time_days: source.dispatch_time_days,
      return_eligible: source.return_eligible,
      shipping_notes: source.shipping_notes,
      status: "DRAFT",
    })
    .select("id, product_code")
    .single();
  if (error || !copy) return fail(`Could not duplicate: ${error.message}`);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: copy.id,
      sku: defaultVariantSku(copy.product_code),
    })
    .select("id")
    .single();
  if (variantError || !variant) {
    await supabase.from("products").delete().eq("id", copy.id);
    return fail(`Could not create default variant: ${variantError.message}`);
  }
  const { error: inventoryError } = await supabase.from("inventory").insert({
    product_id: copy.id,
    variant_id: variant.id,
    quantity: 0,
    low_stock_threshold: 2,
  });
  if (inventoryError) {
    await supabase.from("products").delete().eq("id", copy.id);
    return fail(`Could not create inventory row: ${inventoryError.message}`);
  }

  if (copyImages) {
    const { data: media } = await supabase
      .from("product_media")
      .select("url, cloudinary_public_id, alt, position, is_primary")
      .eq("product_id", productId)
      .order("position");
    if (media && media.length > 0) {
      await supabase.from("product_media").insert(
        media.map((m) => ({
          product_id: copy.id,
          url: m.url,
          cloudinary_public_id: m.cloudinary_public_id,
          alt: m.alt,
          position: m.position,
          is_primary: m.is_primary,
        })),
      );
    }
  }

  revalidatePath("/client/products");
  return { ok: true, data: { id: copy.id } };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) {
    if (error.code === "23503") {
      return fail(
        "Past orders reference this product (history is protected) — archive it instead.",
      );
    }
    return fail(`Could not delete: ${error.message}`);
  }

  revalidatePath("/client/products");
  return { ok: true };
}

/* ── media (§15B) ────────────────────────────────────────────────────── */

export async function addMedia(
  productId: string,
  media: { url: string; cloudinaryPublicId?: string | null; alt?: string | null },
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();

  const { count } = await supabase
    .from("product_media")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { data: existingPrimary } = await supabase
    .from("product_media")
    .select("id")
    .eq("product_id", productId)
    .eq("is_primary", true)
    .maybeSingle();

  const { error } = await supabase.from("product_media").insert({
    product_id: productId,
    url: media.url,
    cloudinary_public_id: media.cloudinaryPublicId ?? null,
    alt: media.alt ?? null,
    position: (count ?? 0) + 1,
    // First image becomes the primary automatically (§15B).
    is_primary: !existingPrimary,
  });
  if (error) return fail(`Could not add image: ${error.message}`);

  revalidatePath(`/client/products/${productId}`);
  return { ok: true };
}

export async function saveMediaOrder(
  productId: string,
  orderedIds: string[],
  primaryId: string | null,
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("product_media")
      .update({
        position: i + 1,
        is_primary: primaryId !== null && orderedIds[i] === primaryId,
      })
      .eq("id", orderedIds[i])
      .eq("product_id", productId);
    if (error) return fail(`Could not reorder: ${error.message}`);
  }

  revalidatePath(`/client/products/${productId}`);
  return { ok: true };
}

export async function setMediaAlt(
  productId: string,
  mediaId: string,
  alt: string,
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("product_media")
    .update({ alt: alt.trim() || null })
    .eq("id", mediaId)
    .eq("product_id", productId);
  if (error) return fail(`Could not save alt text: ${error.message}`);
  return { ok: true };
}

export async function deleteMedia(
  productId: string,
  mediaId: string,
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("product_media")
    .delete()
    .eq("id", mediaId)
    .eq("product_id", productId);
  if (error) return fail(`Could not delete image: ${error.message}`);

  // Keep exactly one primary when any images remain.
  const { data: remaining } = await supabase
    .from("product_media")
    .select("id, is_primary")
    .eq("product_id", productId)
    .order("position");
  if (remaining && remaining.length > 0 && !remaining.some((m) => m.is_primary)) {
    await supabase
      .from("product_media")
      .update({ is_primary: true })
      .eq("id", remaining[0].id);
  }

  revalidatePath(`/client/products/${productId}`);
  return { ok: true };
}

/* ── variants & stock (§3, §15D) ─────────────────────────────────────── */

export async function addVariant(
  productId: string,
  input: { name: string; sellingPricePaise?: number | null },
): Promise<ActionResult> {
  await requireClientRole();
  const name = input.name.trim();
  if (name === "") return fail("Variant name is required.");
  if (
    input.sellingPricePaise !== null &&
    input.sellingPricePaise !== undefined &&
    (!Number.isSafeInteger(input.sellingPricePaise) || input.sellingPricePaise <= 0)
  ) {
    return fail("Variant price must be a positive amount.");
  }

  const supabase = await createServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("product_code")
    .eq("id", productId)
    .single();
  if (!product) return fail("Product not found.");

  const { data: variants } = await supabase
    .from("product_variants")
    .select("sku")
    .eq("product_id", productId);
  const sku = variantSku(
    product.product_code,
    name,
    (variants ?? []).map((v) => v.sku),
  );

  const { data: variant, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: productId,
      sku,
      name,
      selling_price_paise: input.sellingPricePaise ?? null,
    })
    .select("id")
    .single();
  if (error || !variant) return fail(`Could not add variant: ${error.message}`);

  const { error: inventoryError } = await supabase.from("inventory").insert({
    product_id: productId,
    variant_id: variant.id,
    quantity: 0,
    low_stock_threshold: 2,
  });
  if (inventoryError) {
    await supabase.from("product_variants").delete().eq("id", variant.id);
    return fail(`Could not add stock row: ${inventoryError.message}`);
  }

  revalidatePath(`/client/products/${productId}`);
  return { ok: true, data: undefined };
}

export async function updateVariant(
  productId: string,
  variantId: string,
  patch: { name?: string; sellingPricePaise?: number | null; isActive?: boolean },
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();

  if (patch.isActive === false) {
    // §3 invariant: at least one active variant must remain.
    const { data: active } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId)
      .eq("is_active", true);
    const others = (active ?? []).filter((v) => v.id !== variantId);
    if (others.length === 0) {
      return fail("A product must keep at least one active variant.");
    }
  }

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim() || null;
  if (patch.sellingPricePaise !== undefined) {
    update.selling_price_paise = patch.sellingPricePaise;
  }
  if (patch.isActive !== undefined) update.is_active = patch.isActive;

  const { error } = await supabase
    .from("product_variants")
    .update(update)
    .eq("id", variantId)
    .eq("product_id", productId);
  if (error) return fail(`Could not update variant: ${error.message}`);

  revalidatePath(`/client/products/${productId}`);
  return { ok: true };
}

export async function setStock(
  productId: string,
  variantId: string,
  quantity: number,
  lowStockThreshold: number,
): Promise<ActionResult> {
  await requireClientRole();
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    return fail("Stock must be zero or more.");
  }
  if (!Number.isSafeInteger(lowStockThreshold) || lowStockThreshold < 0) {
    return fail("Low-stock threshold must be zero or more.");
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("inventory")
    .update({ quantity, low_stock_threshold: lowStockThreshold })
    .eq("variant_id", variantId)
    .eq("product_id", productId);
  if (error) return fail(`Could not save stock: ${error.message}`);

  revalidatePath(`/client/products/${productId}`);
  revalidatePath("/client/products");
  return { ok: true };
}
