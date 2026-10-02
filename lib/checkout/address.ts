/**
 * Checkout contact + shipping address validation (spec §20).
 *
 * Pure — no fetches, no DB. The only required fields are the ones §20 stars:
 * Full Name, WhatsApp Number, PIN Code, House/Flat, Street, Area. District,
 * State, Locality/Post Office and Country arrive via the §21 PIN lookup
 * (autofilled, still editable when the lookup is unavailable); they are
 * validated for shape whenever present, never invented.
 */

export const PIN_PATTERN = /^[1-9][0-9]{5}$/;

/** Indian mobile: 10 digits starting 6-9, optionally prefixed +91/91/0. */
const PHONE_PATTERN = /^(?:\+?91|0)?([6-9][0-9]{9})$/;

export interface ContactInput {
  fullName: string;
  whatsappPhone: string;
  email: string | null;
}

export interface AddressInput {
  pinCode: string;
  house: string;
  street: string;
  area: string;
  landmark: string | null;
  district: string | null;
  state: string | null;
  locality: string | null;
  country: string | null;
}

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;
export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

function trimmed(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** "9700123456", "+91 97001 23456", "09441234567" → "9700123456"; else null. */
export function normalizeIndianPhone(input: string): string | null {
  const cleaned = input.replace(/[\s-]/g, "");
  const match = PHONE_PATTERN.exec(cleaned);
  return match ? match[1] : null;
}

export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};

  const fullName = trimmed(input.fullName);
  if (fullName.length < 2 || fullName.length > 80) {
    errors.fullName = "Enter your full name (2–80 characters).";
  }

  if (normalizeIndianPhone(input.whatsappPhone) === null) {
    errors.whatsappPhone =
      "Enter a valid 10-digit Indian mobile number for WhatsApp updates.";
  }

  const email = trimmed(input.email);
  if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = "Enter a valid email address, or leave it empty.";
  }

  return errors;
}

export function validateAddress(input: AddressInput): AddressErrors {
  const errors: AddressErrors = {};

  if (!PIN_PATTERN.test(trimmed(input.pinCode))) {
    errors.pinCode = "Enter a valid 6-digit PIN code (no leading zero).";
  }

  const house = trimmed(input.house);
  if (house.length < 1 || house.length > 120) {
    errors.house = "Enter your house / flat number.";
  }

  const street = trimmed(input.street);
  if (street.length < 1 || street.length > 150) {
    errors.street = "Enter your street address.";
  }

  const area = trimmed(input.area);
  if (area.length < 1 || area.length > 120) {
    errors.area = "Enter your area / locality.";
  }

  const landmark = trimmed(input.landmark);
  if (landmark.length > 120) {
    errors.landmark = "Landmark is optional (max 120 characters).";
  }

  const district = trimmed(input.district);
  if (district.length > 100) {
    errors.district = "District is too long (max 100 characters).";
  }

  const state = trimmed(input.state);
  if (state.length > 100) {
    errors.state = "State is too long (max 100 characters).";
  }

  const locality = trimmed(input.locality);
  if (locality.length > 120) {
    errors.locality = "Locality / post office is too long (max 120 characters).";
  }

  const country = trimmed(input.country);
  if (country !== "" && country.toLowerCase() !== "india") {
    errors.country = "We currently deliver only within India.";
  }

  return errors;
}

/** Canonical whitespace-normalized snapshot for storage (§24 snapshots). */
export function normalizedAddress(input: AddressInput): AddressInput {
  return {
    pinCode: trimmed(input.pinCode),
    house: trimmed(input.house),
    street: trimmed(input.street),
    area: trimmed(input.area),
    landmark: blankToNull(input.landmark),
    district: blankToNull(input.district),
    state: blankToNull(input.state),
    locality: blankToNull(input.locality),
    country: blankToNull(input.country) ?? "India",
  };
}

function blankToNull(value: string | null): string | null {
  const t = trimmed(value);
  return t === "" ? null : t;
}
