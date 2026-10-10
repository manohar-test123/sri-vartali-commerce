import { describe, expect, it } from "vitest";

import { planPhoneClaim } from "@/lib/account/profile";
import { buildAccountOrdersFilter, ownsOrder } from "@/lib/account/queries";

describe("planPhoneClaim (account ↔ phone-keyed customer book)", () => {
  it("creates a new customer row when the phone is unknown", () => {
    expect(planPhoneClaim(null, "user-1")).toEqual({ action: "create" });
  });

  it("claims an unowned row left by guest checkouts", () => {
    expect(planPhoneClaim({ id: "c1", user_id: null }, "user-1")).toEqual({
      action: "claim",
      rowId: "c1",
    });
  });

  it("updates in place when the row is already the caller's", () => {
    expect(planPhoneClaim({ id: "c1", user_id: "user-1" }, "user-1")).toEqual({
      action: "update",
      rowId: "c1",
    });
  });

  it("refuses phones linked to a different account", () => {
    expect(planPhoneClaim({ id: "c1", user_id: "user-2" }, "user-1")).toEqual({
      action: "reject",
      reason: "phone_taken",
    });
  });
});

describe("ownsOrder (§7 /account/orders gate)", () => {
  const customer = { id: "c1", name: "Meera", phone: "9876543210", email: null };

  it("owns orders placed under the claimed customer row", () => {
    expect(
      ownsOrder({ customer_id: "c1", email: null }, customer, "me@x.io"),
    ).toBe(true);
  });

  it("owns orders carrying the account email even without a claim", () => {
    expect(
      ownsOrder({ customer_id: "c2", email: "me@x.io" }, null, "me@x.io"),
    ).toBe(true);
  });

  it("does not own foreign orders", () => {
    expect(
      ownsOrder({ customer_id: "c2", email: "other@x.io" }, customer, "me@x.io"),
    ).toBe(false);
    expect(ownsOrder({ customer_id: null, email: null }, null, null)).toBe(false);
  });
});

describe("buildAccountOrdersFilter", () => {
  it("builds PostgREST or filter without double-encoding email", () => {
    expect(buildAccountOrdersFilter("c1", "user@example.com")).toBe(
      "customer_id.eq.c1,email.eq.user@example.com",
    );
    expect(buildAccountOrdersFilter(null, "user@example.com")).toBe(
      "email.eq.user@example.com",
    );
    expect(buildAccountOrdersFilter("c1", null)).toBe("customer_id.eq.c1");
    expect(buildAccountOrdersFilter(null, null)).toBeNull();
  });
});
