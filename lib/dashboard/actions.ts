"use server";

/**
 * Dashboard mutations for the §8 management pages: category CRUD (§4, §41),
 * collection CRUD + membership (§41), inventory adjustments (§15D) with an
 * inventory_movements ledger row (MANUAL_ADJUST), mirroring how place_order
 * records its own movements.
 *
 * Server Actions carrying the caller's session — RLS is the enforcement
 * layer (rule 21); the role guard here is defense in depth, same contract
 * as lib/catalog/actions.ts. Catalog-shape mutations follow the catalog
 * convention (no audit_logs row); stock changes carry their ledger.
 */

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { uniqueSlug } from "@/lib/catalog/slug";
import { createClient as createServerClient } from "@/lib/db/server";
import {
  validateCategoryForm,
  validateCollectionForm,
  validateInventoryAdjustment,
} from "@/lib/dashboard/validation";

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
    throw new Error("Client role required for dashboard management.");
  }
}

async function currentProfileId(): Promise<string | null> {
  const session = await getSession();
  return session.status === "authenticated" ? session.user.id : null;
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/* ── categories (§4, §41) ─────────────────────────────────────────────── */

export async function createCategory(data: FormData): Promise<ActionResult<{ id: string }>> {
  await requireClientRole();
  const { errors, value } = validateCategoryForm({
    name: String(data.get("name") ?? ""),
    description: String(data.get("description") ?? ""),
    parentId: String(data.get("parentId") ?? ""),
    position: String(data.get("position") ?? ""),
    attributeSchemaText: String(data.get("attributeSchema") ?? ""),
  });
  if (!value) {
    return fail(Object.values(errors).join(" · ") || "Invalid category input.");
  }

  const supabase = await createServerClient();

  if (value.parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("id")
      .eq("id", value.parentId)
      .maybeSingle();
    if (!parent) return fail("Parent category not found.");
  }

  const { data: existing } = await supabase.from("categories").select("slug");
  const slug = uniqueSlug(value.name, (existing ?? []).map((r) => r.slug));

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      name: value.name,
      slug,
      description: value.description,
      parent_id: value.parentId,
      position: value.position,
      is_active: data.get("isActive") === "on",
      attribute_schema: value.attributeSchema,
    })
    .select("id")
    .single();
  if (error || !category) return fail(`Could not create category: ${error.message}`);

  revalidatePath("/client/categories");
  return { ok: true, data: { id: category.id } };
}

export async function updateCategory(categoryId: string, data: FormData): Promise<ActionResult> {
  await requireClientRole();
  const { errors, value } = validateCategoryForm({
    name: String(data.get("name") ?? ""),
    description: String(data.get("description") ?? ""),
    parentId: String(data.get("parentId") ?? ""),
    position: String(data.get("position") ?? ""),
    attributeSchemaText: String(data.get("attributeSchema") ?? ""),
  });
  if (!value) {
    return fail(Object.values(errors).join(" · ") || "Invalid category input.");
  }

  if (value.parentId === categoryId) {
    return fail("A category cannot be its own parent.");
  }

  const supabase = await createServerClient();

  // Guard the parent chain: a category may not descend from itself.
  if (value.parentId) {
    let cursor: string | null = value.parentId;
    const seen = new Set<string>();
    while (cursor !== null) {
      if (cursor === categoryId) {
        return fail("A category cannot be moved under one of its own descendants.");
      }
      if (seen.has(cursor)) break; // cycle defence against bad data
      seen.add(cursor);
      const { data } = await supabase
        .from("categories")
        .select("parent_id")
        .eq("id", cursor)
        .maybeSingle();
      const node = data as { parent_id: string | null } | null;
      cursor = node?.parent_id ?? null;
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name: value.name,
      description: value.description,
      parent_id: value.parentId,
      position: value.position,
      is_active: data.get("isActive") === "on",
      attribute_schema: value.attributeSchema,
    })
    .eq("id", categoryId);
  if (error) return fail(`Could not save category: ${error.message}`);

  revalidatePath("/client/categories");
  return { ok: true };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if ((count ?? 0) > 0) {
    return fail(
      `${count} product${count === 1 ? "" : "s"} still use this category — move them first (history stays correct, but products need a home).`,
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) {
    if (error.code === "23503") {
      return fail("This category is still referenced — remove its products first.");
    }
    return fail(`Could not delete category: ${error.message}`);
  }

  revalidatePath("/client/categories");
  return { ok: true };
}

/* ── collections (§41) ────────────────────────────────────────────────── */

export async function createCollection(data: FormData): Promise<ActionResult<{ id: string }>> {
  await requireClientRole();
  const { errors, value } = validateCollectionForm({
    name: String(data.get("name") ?? ""),
    description: String(data.get("description") ?? ""),
    position: String(data.get("position") ?? ""),
  });
  if (!value) {
    return fail(Object.values(errors).join(" · ") || "Invalid collection input.");
  }

  const supabase = await createServerClient();
  const { data: existing } = await supabase.from("collections").select("slug");
  const slug = uniqueSlug(value.name, (existing ?? []).map((r) => r.slug));

  const { data: collection, error } = await supabase
    .from("collections")
    .insert({
      name: value.name,
      slug,
      description: value.description,
      position: value.position,
      is_active: data.get("isActive") === "on",
    })
    .select("id")
    .single();
  if (error || !collection) return fail(`Could not create collection: ${error.message}`);

  revalidatePath("/client/collections");
  return { ok: true, data: { id: collection.id } };
}

export async function updateCollection(
  collectionId: string,
  data: FormData,
): Promise<ActionResult> {
  await requireClientRole();
  const { errors, value } = validateCollectionForm({
    name: String(data.get("name") ?? ""),
    description: String(data.get("description") ?? ""),
    position: String(data.get("position") ?? ""),
  });
  if (!value) {
    return fail(Object.values(errors).join(" · ") || "Invalid collection input.");
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("collections")
    .update({
      name: value.name,
      description: value.description,
      position: value.position,
      is_active: data.get("isActive") === "on",
    })
    .eq("id", collectionId);
  if (error) return fail(`Could not save collection: ${error.message}`);

  revalidatePath("/client/collections");
  return { ok: true };
}

export async function deleteCollection(collectionId: string): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();
  // collection_products rows cascade; products themselves are untouched.
  const { error } = await supabase.from("collections").delete().eq("id", collectionId);
  if (error) return fail(`Could not delete collection: ${error.message}`);

  revalidatePath("/client/collections");
  return { ok: true };
}

export async function addProductToCollection(
  collectionId: string,
  productId: string,
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("collection_products")
    .insert({ collection_id: collectionId, product_id: productId });
  if (error) {
    if (error.code === "23505") {
      return { ok: true }; // already a member — the desired end state
    }
    return fail(`Could not add product: ${error.message}`);
  }
  revalidatePath("/client/collections");
  return { ok: true };
}

export async function removeProductFromCollection(
  collectionId: string,
  productId: string,
): Promise<ActionResult> {
  await requireClientRole();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("collection_products")
    .delete()
    .eq("collection_id", collectionId)
    .eq("product_id", productId);
  if (error) return fail(`Could not remove product: ${error.message}`);
  revalidatePath("/client/collections");
  return { ok: true };
}

/* ── inventory (§15D) ─────────────────────────────────────────────────── */

export async function adjustInventory(
  inventoryId: string,
  data: FormData,
): Promise<ActionResult> {
  await requireClientRole();
  const { errors, value } = validateInventoryAdjustment({
    quantity: String(data.get("quantity") ?? ""),
    lowStockThreshold: String(data.get("lowStockThreshold") ?? ""),
    note: String(data.get("note") ?? ""),
  });
  if (!value) {
    return fail(Object.values(errors).join(" · ") || "Invalid stock input.");
  }

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("inventory")
    .select("id, quantity, variant_id, product_id")
    .eq("id", inventoryId)
    .maybeSingle();
  if (!current) return fail("Inventory row not found.");

  const { error } = await supabase
    .from("inventory")
    .update({
      quantity: value.quantity,
      low_stock_threshold: value.lowStockThreshold,
    })
    .eq("id", inventoryId);
  if (error) return fail(`Could not save stock: ${error.message}`);

  if (value.quantity !== current.quantity) {
    // Ledger row mirrors what place_order/mark_shipped write (§26): every
    // quantity change is attributable. Best-effort after the authoritative
    // update — a failure here must not roll the stock back.
    const actor = await currentProfileId();
    const { error: movementError } = await supabase.from("inventory_movements").insert({
      inventory_id: inventoryId,
      delta: value.quantity - current.quantity,
      reason: "MANUAL_ADJUST",
      note: value.note,
      actor_profile_id: actor,
    });
    if (movementError) {
      return { ok: true };
    }
  }

  revalidatePath("/client/inventory");
  if (current.product_id) {
    revalidatePath(`/client/products/${current.product_id}`);
  }
  return { ok: true };
}
