import { describe, expect, it } from "vitest";

import { isShipmentInformed } from "@/lib/orders/queries";

describe("isShipmentInformed (§38 Tracking missing)", () => {
  it("counts SENT, DELIVERED and READ order_shipped messages as informed", () => {
    for (const status of ["SENT", "DELIVERED", "READ"]) {
      expect(
        isShipmentInformed([{ template_name: "order_shipped", status }]),
      ).toBe(true);
    }
  });

  it("treats unconfirmed messages as uninformed", () => {
    for (const status of ["QUEUED", "FAILED"]) {
      expect(
        isShipmentInformed([{ template_name: "order_shipped", status }]),
      ).toBe(false);
    }
  });

  it("ignores other templates and empty logs", () => {
    expect(
      isShipmentInformed([{ template_name: "payment_confirmed", status: "SENT" }]),
    ).toBe(false);
    expect(isShipmentInformed([])).toBe(false);
  });
});
