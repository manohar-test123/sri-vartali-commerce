import { describe, expect, it } from "vitest";

import {
  normalizeIndianPhone,
  normalizedAddress,
  validateAddress,
  validateContact,
  type AddressInput,
} from "@/lib/checkout/address";

const validContact = {
  fullName: "Meera Krishnan",
  whatsappPhone: "9700123456",
  email: null,
};

const validAddress: AddressInput = {
  pinCode: "500001",
  house: "12-3, Emerald Flats",
  street: "Road No. 12, Banjara Hills",
  area: "Banjara Hills",
  landmark: null,
  district: "Hyderabad",
  state: "Telangana",
  locality: "Banjara Hills",
  country: "India",
};

describe("normalizeIndianPhone", () => {
  it.each([
    ["9700123456", "9700123456"],
    ["+919700123456", "9700123456"],
    ["+91 97001 23456", "9700123456"],
    ["919700123456", "9700123456"],
    ["09700123456", "9700123456"],
  ])("normalizes %s → %s", (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each([
    "5700123456", // doesn't start 6-9
    "970012345", // 9 digits
    "97001234567", // 11 digits
    "97001abc456",
    "",
  ])("rejects %s", (input) => {
    expect(normalizeIndianPhone(input)).toBeNull();
  });
});

describe("validateContact (§20)", () => {
  it("accepts the minimal valid contact", () => {
    expect(validateContact(validContact)).toEqual({});
  });

  it("accepts any 6-9 prefixed mobile spelling", () => {
    expect(
      validateContact({ ...validContact, whatsappPhone: "+91 63000 00000" }),
    ).toEqual({});
  });

  it("requires a real name", () => {
    const errors = validateContact({ ...validContact, fullName: "M" });
    expect(errors.fullName).toBeDefined();
  });

  it("requires a WhatsAppable number", () => {
    const errors = validateContact({ ...validContact, whatsappPhone: "12345" });
    expect(errors.whatsappPhone).toBeDefined();
  });

  it("email is optional but must be shaped when present", () => {
    expect(validateContact({ ...validContact, email: "a@b.co" })).toEqual({});
    expect(validateContact({ ...validContact, email: "not-an-email" }).email).toBeDefined();
    expect(validateContact({ ...validContact, email: "" }).email).toBeUndefined();
  });
});

describe("validateAddress (§20 required-field stars)", () => {
  it("accepts the fully autofilled address", () => {
    expect(validateAddress(validAddress)).toEqual({});
  });

  it("accepts a minimal address — only the starred fields, no lookup data", () => {
    expect(
      validateAddress({
        ...validAddress,
        landmark: "",
        district: "",
        state: "",
        locality: "",
        country: "",
      }),
    ).toEqual({});
  });

  it.each(["5000012", "050001", "50000", "ABCDEG", "50000A"])(
    "rejects malformed PIN %s",
    (pin) => {
      expect(validateAddress({ ...validAddress, pinCode: pin }).pinCode).toBeDefined();
    },
  );

  it("requires house, street and area", () => {
    const errors = validateAddress({
      ...validAddress,
      house: "  ",
      street: "",
      area: "",
    });
    expect(Object.keys(errors)).toEqual(["house", "street", "area"]);
  });

  it("rejects non-India countries", () => {
    expect(
      validateAddress({ ...validAddress, country: "Nepal" }).country,
    ).toBeDefined();
    expect(
      validateAddress({ ...validAddress, country: "india" }).country,
    ).toBeUndefined();
  });

  it("caps optional field lengths", () => {
    const long = "x".repeat(130);
    const errors = validateAddress({
      ...validAddress,
      landmark: long,
      locality: long,
    });
    expect(errors.landmark).toBeDefined();
    expect(errors.locality).toBeDefined();
  });
});

describe("normalizedAddress (§24 snapshot shape)", () => {
  it("trims, blanks to null, and defaults the country", () => {
    expect(
      normalizedAddress({
        pinCode: " 500001 ",
        house: " 12-3 ",
        street: " Road No. 12 ",
        area: " Banjara Hills ",
        landmark: "  ",
        district: " Hyderabad ",
        state: " Telangana ",
        locality: "",
        country: null,
      }),
    ).toEqual({
      pinCode: "500001",
      house: "12-3",
      street: "Road No. 12",
      area: "Banjara Hills",
      landmark: null,
      district: "Hyderabad",
      state: "Telangana",
      locality: null,
      country: "India",
    });
  });
});
