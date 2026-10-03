"use server";

/**
 * Account self-service mutations (§7 /account/profile, /account/addresses).
 * Every action re-derives ownership from the session: the profile claim
 * follows planPhoneClaim (phone-keyed customer book), and address writes
 * only ever touch rows belonging to the caller's customers row.
 */

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import {
  normalizeIndianPhone,
  validateAddress,
  type AddressInput,
} from "@/lib/checkout/address";
import { createAdminClient } from "@/lib/db/admin";
import { planPhoneClaim } from "@/lib/account/profile";
import { getAccountCustomer } from "@/lib/account/queries";

export type AccountActionResult =
  | { status: "ok"; message?: string }
  | { status: "error"; error: string };

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

async function requireSession(context: string) {
  const session = await getSession();
  if (session.status !== "authenticated") {
    return { denied: `${context}: please sign in first.` as string | null, session: null };
  }
  return { denied: null, session };
}

/** Save name + phone, claiming the phone-keyed customer row (or creating one). */
export async function saveProfileAction(
  _prev: AccountActionResult | null,
  data: FormData,
): Promise<AccountActionResult> {
  const { denied, session } = await requireSession("profile");
  if (denied || !session) return { status: "error", error: denied! };

  const name = field(data, "name").trim();
  const phone = normalizeIndianPhone(field(data, "phone"));
  if (name.length < 2 || name.length > 80) {
    return { status: "error", error: "Enter your name (2–80 characters)." };
  }
  if (phone === null) {
    return { status: "error", error: "Enter a valid 10-digit mobile number." };
  }

  const admin = createAdminClient();
  const { data: existing, error: findError } = await admin
    .from("customers")
    .select("id, user_id")
    .eq("phone", phone)
    .maybeSingle();
  if (findError) {
    return { status: "error", error: "Could not save right now. Try again." };
  }

  const plan = planPhoneClaim(
    (existing as { id: string; user_id: string | null } | null) ?? null,
    session.user.id,
  );

  if (plan.action === "reject") {
    return {
      status: "error",
      error:
        "That phone number is already linked to another account. If it is really yours, message the store.",
    };
  }

  if (plan.action === "create") {
    const { error } = await admin.from("customers").insert({
      user_id: session.user.id,
      name,
      phone,
      email: session.user.email,
    });
    if (error) return { status: "error", error: "Could not save right now. Try again." };
  } else {
    const { error } = await admin
      .from("customers")
      .update({
        user_id: session.user.id,
        name,
        email: session.user.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.rowId);
    if (error) return { status: "error", error: "Could not save right now. Try again." };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/account/orders");
  revalidatePath("/account/addresses");
  return {
    status: "ok",
    message:
      plan.action === "update"
        ? "Profile saved."
        : "Saved — your orders and address book are now linked to this account.",
  };
}

/** Insert or update one address; optionally make it the default. */
export async function saveAddressAction(
  _prev: AccountActionResult | null,
  data: FormData,
): Promise<AccountActionResult> {
  const { denied, session } = await requireSession("address");
  if (denied || !session) return { status: "error", error: denied! };

  const customer = await getAccountCustomer(session.user.id);
  if (!customer) {
    return {
      status: "error",
      error: "Add your name and phone number on the profile page first.",
    };
  }

  const addressId = field(data, "addressId");
  const label = field(data, "label").trim() || null;
  const input: AddressInput = {
    pinCode: field(data, "pinCode"),
    house: field(data, "house"),
    street: field(data, "street"),
    area: field(data, "area"),
    landmark: field(data, "landmark") || null,
    district: field(data, "district") || null,
    state: field(data, "state") || null,
    locality: field(data, "locality") || null,
    country: field(data, "country") || "India",
  };
  const makeDefault = field(data, "isDefault") === "on";

  const errors = validateAddress(input);
  if (Object.keys(errors).length > 0) {
    return { status: "error", error: "Please complete the required address fields." };
  }

  const admin = createAdminClient();
  const row = {
    customer_id: customer.id,
    label,
    house: input.house.trim(),
    street: input.street.trim(),
    area: input.area.trim(),
    landmark: input.landmark?.trim() || null,
    district: input.district?.trim() || null,
    state: input.state?.trim() || null,
    locality: input.locality?.trim() || null,
    pincode: input.pinCode.trim(),
    country: input.country?.trim() || "India",
    updated_at: new Date().toISOString(),
  };

  let savedId = addressId;
  if (addressId) {
    const { error } = await admin
      .from("addresses")
      .update(row)
      .eq("id", addressId)
      .eq("customer_id", customer.id);
    if (error) return { status: "error", error: "Could not save the address. Try again." };
  } else {
    const { data: inserted, error } = await admin
      .from("addresses")
      .insert(row)
      .select("id")
      .single();
    if (error || !inserted) {
      return { status: "error", error: "Could not save the address. Try again." };
    }
    savedId = (inserted as { id: string }).id;
  }

  if (makeDefault && savedId) {
    await admin
      .from("addresses")
      .update({ is_default: false })
      .eq("customer_id", customer.id)
      .neq("id", savedId);
    await admin
      .from("addresses")
      .update({ is_default: true })
      .eq("id", savedId)
      .eq("customer_id", customer.id);
  }

  revalidatePath("/account/addresses");
  return { status: "ok", message: "Address saved." };
}

async function ownedAddressId(
  session: { user: { id: string } },
  addressId: string,
): Promise<string | null> {
  const customer = await getAccountCustomer(session.user.id);
  if (!customer) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("addresses")
    .select("id")
    .eq("id", addressId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function deleteAddressAction(
  addressId: string,
): Promise<AccountActionResult> {
  const { denied, session } = await requireSession("address");
  if (denied || !session) return { status: "error", error: denied! };

  const owned = await ownedAddressId(session, addressId);
  if (!owned) return { status: "error", error: "Address not found." };

  const admin = createAdminClient();
  const { error } = await admin.from("addresses").delete().eq("id", owned);
  if (error) return { status: "error", error: "Could not delete the address." };

  revalidatePath("/account/addresses");
  return { status: "ok", message: "Address removed." };
}

export async function setDefaultAddressAction(
  addressId: string,
): Promise<AccountActionResult> {
  const { denied, session } = await requireSession("address");
  if (denied || !session) return { status: "error", error: denied! };

  const customer = await getAccountCustomer(session.user.id);
  if (!customer) return { status: "error", error: "Address book not linked yet." };

  const owned = await ownedAddressId(session, addressId);
  if (!owned) return { status: "error", error: "Address not found." };

  const admin = createAdminClient();
  await admin
    .from("addresses")
    .update({ is_default: false })
    .eq("customer_id", customer.id);
  const { error } = await admin
    .from("addresses")
    .update({ is_default: true })
    .eq("id", owned);
  if (error) return { status: "error", error: "Could not set the default address." };

  revalidatePath("/account/addresses");
  return { status: "ok", message: "Default address updated." };
}
