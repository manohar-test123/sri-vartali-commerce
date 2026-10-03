import { describe, expect, it } from "vitest";

import {
  buildInactiveOrderMessage,
  buildPaidAckMessage,
  buildPaymentConfirmedMessage,
  buildPaymentInstructionsMessage,
  buildShippedMessage,
  hasQrToSend,
} from "@/lib/whatsapp/templates";

const baseOrder = {
  customerName: "Anjali Reddy",
  orderNumber: "SVS-ORD-20261002-00129",
  totalPaise: 1109600,
};

const fullSettings = {
  businessName: "Sri Vartali Sarees",
  upiId: "srivartali@okhdfcbank",
  upiQrUrl: "https://res.cloudinary.com/demo/qr.png",
  paymentInstructions: null,
};

describe("buildPaymentInstructionsMessage (§29)", () => {
  it("renders the spec template when QR + UPI are configured", () => {
    const message = buildPaymentInstructionsMessage({
      ...baseOrder,
      settings: fullSettings,
    });

    expect(message).toContain("Thank you for your order, Anjali Reddy ✨");
    expect(message).toContain("Order ID:\nSVS-ORD-20261002-00129");
    expect(message).toContain("Total:\n₹11,096");
    expect(message).toContain(
      "Please complete your payment using the QR code below.",
    );
    expect(message).toContain("After completing payment, reply:\nPAID");
    expect(message).toContain(
      "Our team will verify your payment and confirm your order.",
    );
  });

  it("names the UPI ID instead of the QR when only UPI is configured", () => {
    const message = buildPaymentInstructionsMessage({
      ...baseOrder,
      settings: { ...fullSettings, upiQrUrl: null },
    });

    expect(message).toContain(
      "Please complete your payment via UPI to srivartali@okhdfcbank.",
    );
    expect(message).not.toContain("QR code below");
  });

  it("defers payment details when nothing is configured", () => {
    const message = buildPaymentInstructionsMessage({
      ...baseOrder,
      settings: {
        businessName: null,
        upiId: null,
        upiQrUrl: null,
        paymentInstructions: null,
      },
    });

    expect(message).toContain(
      "Our team will share payment details with you shortly on this chat.",
    );
  });

  it("replaces the payment sentence with owner-configured instructions", () => {
    const message = buildPaymentInstructionsMessage({
      ...baseOrder,
      settings: {
        ...fullSettings,
        paymentInstructions: "Pay to UPI 9876543210 and reply with the UTR.",
      },
    });

    expect(message).toContain(
      "Pay to UPI 9876543210 and reply with the UTR.",
    );
    expect(message).not.toContain("QR code below");
    // The PAID envelope stays ours regardless of custom wording.
    expect(message).toContain("After completing payment, reply:\nPAID");
  });
});

describe("hasQrToSend", () => {
  it("is true only when a QR url is set", () => {
    expect(hasQrToSend(fullSettings)).toBe(true);
    expect(hasQrToSend({ ...fullSettings, upiQrUrl: null })).toBe(false);
    expect(hasQrToSend({ ...fullSettings, upiQrUrl: "  " })).toBe(false);
  });
});

describe("buildPaidAckMessage (§31)", () => {
  it("records the claim and promises human verification only", () => {
    const message = buildPaidAckMessage({
      customerName: "Anjali",
      orderNumber: "SVS-ORD-20261002-00129",
    });

    expect(message).toContain("Thank you, Anjali!");
    expect(message).toContain("recorded your payment confirmation");
    expect(message).toContain(
      "Our team will verify your payment and confirm your order shortly.",
    );
    // Never claims the payment IS verified — §31 forbids auto-verification.
    expect(message).not.toMatch(/payment (is )?verified/i);
  });
});

describe("buildInactiveOrderMessage", () => {
  it("references the order code and the store name", () => {
    const message = buildInactiveOrderMessage({
      orderNumber: "SVS-ORD-20261002-00129",
      businessName: "Sri Vartali Sarees",
    });

    expect(message).toContain("SVS-ORD-20261002-00129");
    expect(message).toContain("Sri Vartali Sarees");
    expect(message).toContain("no longer active");
  });

  it("falls back to the default store name", () => {
    const message = buildInactiveOrderMessage({
      orderNumber: "SVS-ORD-20261002-00129",
      businessName: null,
    });
    expect(message).toContain("Sri Vartali Sarees");
  });
});

describe("buildPaymentConfirmedMessage (§33)", () => {
  it("confirms payment with the spec's line-for-line shape", () => {
    const message = buildPaymentConfirmedMessage({
      customerName: "Anjali",
      orderNumber: "SVS-ORD-20261002-00129",
      totalPaise: 1109600,
    });

    expect(message).toContain("Payment confirmed ✅");
    expect(message).toContain("Thank you, Anjali!");
    expect(message).toContain("Order ID:");
    expect(message).toContain("SVS-ORD-20261002-00129");
    expect(message).toContain("Amount received:");
    expect(message).toContain("₹11,096");
    expect(message).toContain("Your order is now being prepared.");
    expect(message).toContain(
      "We will message you again with tracking details once it is dispatched.",
    );
  });

  it("starts with the confirmation line — contrast with the §31 ack", () => {
    const message = buildPaymentConfirmedMessage({
      customerName: "Anjali",
      orderNumber: "SVS-ORD-20261002-00129",
      totalPaise: 1109600,
    });
    expect(message.startsWith("Payment confirmed ✅")).toBe(true);
  });
});

describe("buildShippedMessage (§36)", () => {
  const baseShipment = {
    orderNumber: "SVS-ORD-20261002-00129",
    courier: "Delhivery",
    trackingId: "178921791712",
    trackingUrl: "https://tracking-url.example",
    productCount: 3,
    pieceCount: 4,
  };

  it("renders the spec's line-for-line shape", () => {
    const message = buildShippedMessage(baseShipment);

    expect(message).toBe(
      [
        "Your Sri Vartali order has been shipped 📦✨",
        "",
        "Order ID:",
        "SVS-ORD-20261002-00129",
        "",
        "Courier:",
        "Delhivery",
        "",
        "Tracking ID:",
        "178921791712",
        "",
        "Track your order:",
        "https://tracking-url.example",
        "",
        "Items:",
        "3 products / 4 pieces",
        "",
        "Your order is on its way.",
        "",
        "Thank you for shopping with Sri Vartali Sarees ❤️",
      ].join("\n"),
    );
  });

  it("omits the track block entirely when no URL was given", () => {
    const message = buildShippedMessage({
      ...baseShipment,
      trackingUrl: null,
    });
    expect(message).not.toContain("Track your order:");
    expect(message).toContain("Items:\n3 products / 4 pieces");
  });

  it("pluralizes honestly for single-item orders", () => {
    const message = buildShippedMessage({
      ...baseShipment,
      productCount: 1,
      pieceCount: 1,
    });
    expect(message).toContain("Items:\n1 product / 1 piece");
  });
});
