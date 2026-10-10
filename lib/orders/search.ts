/**
 * §58 "Find order by Order ID": the client orders list search. Pure —
 * listOrders applies it in-memory (launch-scale trade-off, same as the
 * inventory/customers lists).
 */

export interface OrderSearchRow {
  orderNumber: string;
  customerName: string;
  phone: string;
}

/**
 * Case-insensitive substring match on order number, customer name or
 * phone. Phone terms ignore spaces so "98490 12345" finds "9849012345".
 */
export function matchesOrderSearch(
  row: OrderSearchRow,
  term: string | undefined,
): boolean {
  const needle = term?.trim().toLowerCase();
  if (!needle) return true;
  const phoneNeedle = needle.replace(/\s+/g, "");
  return (
    row.orderNumber.toLowerCase().includes(needle) ||
    row.customerName.toLowerCase().includes(needle) ||
    row.phone.replace(/\s+/g, "").includes(phoneNeedle)
  );
}
