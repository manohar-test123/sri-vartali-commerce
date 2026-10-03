import { describe, expect, it } from "vitest";

import {
  buildTrackSteps,
  normalizeShippingInput,
} from "@/lib/orders/shipping";
import { canMarkShipped } from "@/lib/orders/status";

describe("normalizeShippingInput (§35)", () => {
  it("trims and normalizes a blank URL to null", () => {
    expect(
      normalizeShippingInput({
        courier: "  Delhivery  ",
        trackingId: " 178921791712 ",
        trackingUrl: "   ",
      }),
    ).toEqual({
      ok: true,
      value: {
        courier: "Delhivery",
        trackingId: "178921791712",
        trackingUrl: null,
      },
    });
  });

  it("accepts an https tracking URL", () => {
    const result = normalizeShippingInput({
      courier: "Blue Dart",
      trackingId: "BD-4471-998",
      trackingUrl: "https://www.bluedart.com/track?num=BD4471998",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a courier that is blank or oversized", () => {
    expect(
      normalizeShippingInput({ courier: "x", trackingId: "178921791712", trackingUrl: "" }).ok,
    ).toBe(false);
    expect(
      normalizeShippingInput({ courier: "y".repeat(61), trackingId: "178921791712", trackingUrl: "" }).ok,
    ).toBe(false);
  });

  it("rejects tracking IDs with spaces or symbols", () => {
    expect(
      normalizeShippingInput({ courier: "Delhivery", trackingId: "178 921", trackingUrl: "" }).ok,
    ).toBe(false);
    expect(
      normalizeShippingInput({ courier: "Delhivery", trackingId: "TR/1", trackingUrl: "" }).ok,
    ).toBe(false);
    expect(
      normalizeShippingInput({ courier: "Delhivery", trackingId: "1".repeat(65), trackingUrl: "" }).ok,
    ).toBe(false);
  });

  it("rejects tracking URLs that are not absolute http(s) links", () => {
    expect(
      normalizeShippingInput({ courier: "Delhivery", trackingId: "178921791712", trackingUrl: "delhivery.com/track" }).ok,
    ).toBe(false);
    expect(
      normalizeShippingInput({ courier: "Delhivery", trackingId: "178921791712", trackingUrl: "javascript:alert(1)" }).ok,
    ).toBe(false);
  });
});

describe("canMarkShipped (§34/§35)", () => {
  it("allows every pre-shipping fulfilment state on an open order", () => {
    expect(canMarkShipped("CREATED", "UNFULFILLED")).toBe(true);
    expect(canMarkShipped("CREATED", "PROCESSING")).toBe(true);
    expect(canMarkShipped("CONFIRMED", "PACKED")).toBe(true);
  });

  it("refuses closed orders and post-shipping states", () => {
    expect(canMarkShipped("CREATED", "SHIPPED")).toBe(false);
    expect(canMarkShipped("CREATED", "DELIVERED")).toBe(false);
    expect(canMarkShipped("CANCELLED", "PACKED")).toBe(false);
    expect(canMarkShipped("COMPLETED", "PACKED")).toBe(false);
  });
});

describe("buildTrackSteps (§37)", () => {
  it("marks the shipped order exactly like the spec sample", () => {
    const steps = buildTrackSteps({
      paymentStatus: "VERIFIED",
      fulfilmentStatus: "SHIPPED",
    });
    expect(steps.map((s) => `${s.label} ${s.state}`).join("\n")).toBe(
      [
        "Order received done",
        "Payment confirmed done",
        "Processing done",
        "Packed done",
        "Shipped current",
        "Delivered todo",
      ].join("\n"),
    );
  });

  it("parks at payment confirmed while payment is unsettled", () => {
    const steps = buildTrackSteps({
      paymentStatus: "PENDING",
      fulfilmentStatus: "UNFULFILLED",
    });
    expect(steps[0].state).toBe("done"); // received
    expect(steps[1].state).toBe("current"); // payment
    expect(steps[5].state).toBe("todo"); // delivered
    expect(
      buildTrackSteps({
        paymentStatus: "CUSTOMER_CLAIMS_PAID",
        fulfilmentStatus: "UNFULFILLED",
      })[1].state,
    ).toBe("current");
  });

  it("walks the ladder as the order progresses", () => {
    expect(
      buildTrackSteps({ paymentStatus: "VERIFIED", fulfilmentStatus: "UNFULFILLED" })
        .map((s) => s.state),
    ).toEqual(["done", "done", "current", "todo", "todo", "todo"]);
    expect(
      buildTrackSteps({ paymentStatus: "VERIFIED", fulfilmentStatus: "PROCESSING" })
        .map((s) => s.state),
    ).toEqual(["done", "done", "current", "todo", "todo", "todo"]);
    expect(
      buildTrackSteps({ paymentStatus: "VERIFIED", fulfilmentStatus: "PACKED" })
        .map((s) => s.state),
    ).toEqual(["done", "done", "done", "current", "todo", "todo"]);
  });

  it("completes every step when delivered", () => {
    const steps = buildTrackSteps({
      paymentStatus: "VERIFIED",
      fulfilmentStatus: "DELIVERED",
    });
    expect(steps.every((s) => s.state === "done")).toBe(true);
  });
});
