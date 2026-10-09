/**
 * §39 realtime: pure translation of an orders postgres_changes payload
 * into the dashboard toast message — or null when the change is not
 * dashboard-relevant (deletes, or updates that did not move
 * payment_status / fulfilment_status). Unit-tested; the OrdersLive
 * component consumes this and calls router.refresh().
 */

export type OrderChangeRow = {
  order_number?: string | null;
  payment_status?: string | null;
  fulfilment_status?: string | null;
};

export type OrderChangeEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  old: OrderChangeRow | null;
  new: OrderChangeRow | null;
};

function humanise(status: string): string {
  return status.replaceAll("_", " ").toLowerCase();
}

export function describeOrderChange(event: OrderChangeEvent): string | null {
  const newRow = event.new;

  if (event.eventType === "INSERT" && newRow?.order_number) {
    return `New order ${newRow.order_number} placed.`;
  }

  if (event.eventType === "UPDATE" && newRow?.order_number && event.old) {
    const moves: string[] = [];
    if (
      event.old.payment_status &&
      newRow.payment_status &&
      event.old.payment_status !== newRow.payment_status
    ) {
      moves.push(`payment ${humanise(event.old.payment_status)} → ${humanise(newRow.payment_status)}`);
    }
    if (
      event.old.fulfilment_status &&
      newRow.fulfilment_status &&
      event.old.fulfilment_status !== newRow.fulfilment_status
    ) {
      moves.push(
        `fulfilment ${humanise(event.old.fulfilment_status)} → ${humanise(newRow.fulfilment_status)}`,
      );
    }
    if (moves.length === 0) return null;
    return `Order ${newRow.order_number}: ${moves.join(" · ")}.`;
  }

  return null;
}
