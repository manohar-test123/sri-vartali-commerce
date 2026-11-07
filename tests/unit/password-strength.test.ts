import { describe, expect, it } from "vitest";

import {
  MIN_PASSWORD_LENGTH,
  validatePasswordStrength,
} from "@/lib/account/register";

describe("validatePasswordStrength (shared policy: registration + reset)", () => {
  it("accepts a policy-compliant password", () => {
    expect(validatePasswordStrength("saree2026")).toBeNull();
    expect(validatePasswordStrength("Abc123!x")).toBeNull();
  });

  it(`rejects passwords shorter than ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(validatePasswordStrength("ab1")).toBe(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  });

  it("rejects passwords without a number", () => {
    expect(validatePasswordStrength("silksarees")).toBe(
      "Password needs at least one letter and one number.",
    );
  });

  it("rejects passwords without a letter", () => {
    expect(validatePasswordStrength("12345678")).toBe(
      "Password needs at least one letter and one number.",
    );
  });

  it("empty password hits the length rule, not a crash", () => {
    expect(validatePasswordStrength("")).toBe(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  });
});
