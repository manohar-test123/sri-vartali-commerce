import { describe, expect, it } from "vitest";

import {
  validateSettingsInput,
  type SettingsInput,
} from "@/lib/settings/validation";

const valid: SettingsInput = {
  businessName: "Sri Vartali Sarees",
  upiId: "srivartali@okhdfcbank",
  upiQrUrl: "https://res.cloudinary.com/demo/qr.png",
  paymentInstructions: "",
  whatsappStoreNumber: "+91 98765 43210",
};

describe("validateSettingsInput (§30)", () => {
  it("passes a fully-filled valid input", () => {
    expect(validateSettingsInput(valid)).toEqual({});
  });

  it("passes empty optional fields", () => {
    expect(
      validateSettingsInput({
        businessName: "Sri Vartali Sarees",
        upiId: "",
        upiQrUrl: "",
        paymentInstructions: "",
        whatsappStoreNumber: "",
      }),
    ).toEqual({});
  });

  it("rejects a missing or too-long business name", () => {
    expect(
      validateSettingsInput({ ...valid, businessName: "S" }).businessName,
    ).toBeDefined();
    expect(
      validateSettingsInput({ ...valid, businessName: "x".repeat(81) })
        .businessName,
    ).toBeDefined();
  });

  it("rejects malformed UPI ids", () => {
    expect(validateSettingsInput({ ...valid, upiId: "no-at-sign" }).upiId).toBeDefined();
    expect(validateSettingsInput({ ...valid, upiId: "a@b" }).upiId).toBeDefined();
    expect(validateSettingsInput({ ...valid, upiId: "has space@bank" }).upiId).toBeDefined();
    expect(validateSettingsInput({ ...valid, upiId: "name@bank" }).upiId).toBeUndefined();
  });

  it("requires https for the QR image URL", () => {
    expect(
      validateSettingsInput({ ...valid, upiQrUrl: "http://cdn.example/qr.png" })
        .upiQrUrl,
    ).toBeDefined();
    expect(
      validateSettingsInput({ ...valid, upiQrUrl: "not-a-url" }).upiQrUrl,
    ).toBeDefined();
  });

  it("caps payment instructions length", () => {
    expect(
      validateSettingsInput({
        ...valid,
        paymentInstructions: "x".repeat(1001),
      }).paymentInstructions,
    ).toBeDefined();
    expect(
      validateSettingsInput({
        ...valid,
        paymentInstructions: "x".repeat(1000),
      }).paymentInstructions,
    ).toBeUndefined();
  });

  it("accepts 10-digit and country-coded store numbers, rejects short ones", () => {
    expect(
      validateSettingsInput({ ...valid, whatsappStoreNumber: "9876543210" })
        .whatsappStoreNumber,
    ).toBeUndefined();
    expect(
      validateSettingsInput({ ...valid, whatsappStoreNumber: "+91 98765 43210" })
        .whatsappStoreNumber,
    ).toBeUndefined();
    expect(
      validateSettingsInput({ ...valid, whatsappStoreNumber: "98765" })
        .whatsappStoreNumber,
    ).toBeDefined();
  });
});
