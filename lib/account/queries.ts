/**
 * Account-area reads (spec §7 /account routes). An order belongs to the
 * signed-in user when it was placed under their claimed customer row
 * (checkout is phone-keyed) OR carries their account email. Every query
 * below re-derives that ownership from the session — ids from URLs are
 * never trusted alone.
 */

import { createAdminClient } from "@/lib/db/admin";
import { getOrderById, type OrderWithItems } from "@/lib/orders/queries";
import type { OrderStatus, PaymentStatus, FulfilmentStatus } from "@/lib/orders/status";

export interface AccountCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export async function getAccountCustomer(
  userId: string,
): Promise<AccountCustomer | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("id, name, phone, email")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`account customer: ${error.message}`);
  return (data as AccountCustomer | null) ?? null;
}

/** Ownership predicate shared by the list and detail pages. */
export function ownsOrder(
  order: { customer_id: string | null; email: string | null },
  customer: AccountCustomer | null,
  accountEmail: string | null,
): boolean {
  if (customer && order.customer_id === customer.id) return true;
  if (accountEmail && order.email === accountEmail) return true;
  return false;
}

export interface AccountOrderRow {
  id: string;
  order_number: string;
  created_at: string;
  total_paise: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  fulfilment_status: FulfilmentStatus;
  items: Array<{
    product_name_snapshot: string;
    image_snapshot: string | null;
    quantity: number;
  }>;
}

export async function listAccountOrders(
  userId: string,
  accountEmail: string | null,
): Promise<AccountOrderRow[]> {
  const admin = createAdminClient();
  const customer = await getAccountCustomer(userId);

  const orParts: string[] = [];
  if (customer) orParts.push(`customer_id.eq.${customer.id}`);
  if (accountEmail) orParts.push(`email.eq.${encodeURIComponent(accountEmail)}`);
  if (orParts.length === 0) return [];

  const { data, error } = await admin
    .from("orders")
    .select(
      `id, order_number, created_at, total_paise, customer_id, email,
       order_status, payment_status, fulfilment_status,
       order_items (product_name_snapshot, image_snapshot, quantity)`,
    )
    .or(orParts.join(","))
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`account orders: ${error.message}`);

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      order_number: string;
      created_at: string;
      total_paise: number;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      fulfilment_status: FulfilmentStatus;
      order_items: Array<{
        product_name_snapshot: string;
        image_snapshot: string | null;
        quantity: number;
      }>;
    };
    return { ...r, items: r.order_items ?? [] };
  });
}

export async function getAccountOrder(
  userId: string,
  accountEmail: string | null,
  orderId: string,
): Promise<OrderWithItems | null> {
  const customer = await getAccountCustomer(userId);
  const found = await getOrderById(orderId);
  if (!found) return null;
  if (!ownsOrder(found.order, customer, accountEmail)) return null;
  return found;
}

export interface AccountAddress {
  id: string;
  label: string | null;
  house: string;
  street: string;
  area: string;
  landmark: string | null;
  locality: string | null;
  district: string | null;
  state: string | null;
  pincode: string;
  is_default: boolean;
}

export async function getAccountAddresses(
  userId: string,
): Promise<AccountAddress[]> {
  const customer = await getAccountCustomer(userId);
  if (!customer) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("addresses")
    .select(
      `id, label, house, street, area, landmark, locality, district, state,
       pincode, is_default`,
    )
    .eq("customer_id", customer.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`account addresses: ${error.message}`);
  return (data ?? []) as AccountAddress[];
}
