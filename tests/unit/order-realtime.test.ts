import { describe, expect, it } from "vitest";

import { describeOrderChange } from "@/lib/orders/realtime";

const ROW = {
  order_number: "SVS-ORD-20261009-00007",
  payment_status: "PENDING",
  fulfilment_status: "UNFULFILLED",
};

describe("describeOrderChange (§39)", () => {
  it("announces new orders on INSERT", () => {
    expect(
      describeOrderChange({ eventType: "INSERT", old: null, new: ROW }),
    ).toBe("New order SVS-ORD-20261009-00007 placed.");
  });

  it("announces payment status moves on UPDATE", () => {
    expect(
      describeOrderChange({
        eventType: "UPDATE",
        old: { ...ROW },
        new: { ...ROW, payment_status: "VERIFIED" },
      }),
    ).toBe("Order SVS-ORD-20261009-00007: payment pending → verified.");
  });

  it("announces fulfilment status moves on UPDATE", () => {
    expect(
      describeOrderChange({
        eventType: "UPDATE",
        old: { ...ROW },
        new: { ...ROW, fulfilment_status: "SHIPPED" },
      }),
    ).toBe("Order SVS-ORD-20261009-00007: fulfilment unfulfilled → shipped.");
  });

  it("joins both moves when payment and fulfilment change together", () => {
    expect(
      describeOrderChange({
        eventType: "UPDATE",
        old: { ...ROW },
        new: { ...ROW, payment_status: "VERIFIED", fulfilment_status: "PROCESSING" },
      }),
    ).toBe(
      "Order SVS-ORD-20261009-00007: payment pending → verified · fulfilment unfulfilled → processing.",
    );
  });

  it("stays silent when neither tracked status changed", () => {
    // Untracked columns may move (e.g. totals) — not dashboard-worthy.
    const untouched: typeof ROW & { total_paise: number } = { ...ROW, total_paise: 999 };
    expect(
      describeOrderChange({ eventType: "UPDATE", old: { ...ROW }, new: untouched }),
    ).toBeNull();
  });

  it("stays silent on DELETE and on payloads without an order number", () => {
    expect(
      describeOrderChange({ eventType: "DELETE", old: ROW, new: null }),
    ).toBeNull();
    expect(
      describeOrderChange({ eventType: "INSERT", old: null, new: { payment_status: "PENDING" } }),
    ).toBeNull();
  });

  it("stays silent on UPDATE when the old row is missing (no replica identity)", () => {
    expect(
      describeOrderChange({
        eventType: "UPDATE",
        old: null,
        new: { ...ROW, payment_status: "VERIFIED" },
      }),
    ).toBeNull();
  });
});
