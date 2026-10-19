import { describe, expect, it } from "vitest";

import {
  MIN_PASSWORD_LENGTH,
  mapSignUpError,
  validateRegistration,
} from "@/lib/account/register";

const valid = {
  name: "Ananya Rao",
  email: "ananya@example.com",
  password: "silktree9",
  confirmPassword: "silktree9",
};

describe("validateRegistration (Phase 20 sign-up rules)", () => {
  it("accepts a well-formed registration", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("requires a name of at least 2 trimmed characters", () => {
    expect(validateRegistration({ ...valid, name: "  A " }).name).toBeDefined();
    expect(validateRegistration({ ...valid, name: "" }).name).toBeDefined();
    expect(validateRegistration({ ...valid, name: "  " }).name).toBeDefined();
    expect(validateRegistration({ ...valid, name: " Aa " }).name).toBeUndefined();
  });

  it("caps name length at 60 characters", () => {
    expect(
      validateRegistration({ ...valid, name: "A".repeat(61) }).name,
    ).toBeDefined();
    expect(
      validateRegistration({ ...valid, name: "A".repeat(60) }).name,
    ).toBeUndefined();
  });

  it("rejects malformed emails", () => {
    expect(validateRegistration({ ...valid, email: "not-an-email" }).email).toBeDefined();
    expect(validateRegistration({ ...valid, email: "a@b" }).email).toBeDefined();
    expect(validateRegistration({ ...valid, email: "a b@c.com" }).email).toBeDefined();
    expect(
      validateRegistration({ ...valid, email: " a@b.co " }).email,
    ).toBeUndefined();
  });

  it(`requires ${MIN_PASSWORD_LENGTH}+ character passwords`, () => {
    expect(validateRegistration({ ...valid, password: "ab1", confirmPassword: "ab1" }).password).toBeDefined();
    expect(
      validateRegistration({
        ...valid,
        password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
        confirmPassword: "a".repeat(MIN_PASSWORD_LENGTH - 1),
      }).password,
    ).toBeDefined();
    expect(
      validateRegistration({
        ...valid,
        password: "a".repeat(MIN_PASSWORD_LENGTH),
        confirmPassword: "a".repeat(MIN_PASSWORD_LENGTH),
      }).password,
    ).toBeDefined();
  });

  it("requires a letter and a number in the password", () => {
    expect(
      validateRegistration({ ...valid, password: "12345678", confirmPassword: "12345678" })
        .password,
    ).toBeDefined();
    expect(
      validateRegistration({ ...valid, password: "silkweave", confirmPassword: "silkweave" })
        .password,
    ).toBeDefined();
  });

  it("flags mismatched confirmation", () => {
    expect(
      validateRegistration({ ...valid, confirmPassword: "different1" })
        .confirmPassword,
    ).toBeDefined();
  });

  it("reports every failing field at once", () => {
    const errors = validateRegistration({
      name: "",
      email: "bad",
      password: "short",
      confirmPassword: "other",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "confirmPassword",
      "email",
      "name",
      "password",
    ]);
  });
});

describe("mapSignUpError (Supabase message → user-facing)", () => {
  it("recognises duplicate accounts", () => {
    expect(mapSignUpError("User already registered")).toContain(
      "already exists",
    );
  });

  it("recognises weak-password rejections", () => {
    expect(mapSignUpError("Password should be at least 6 characters")).toContain(
      "too weak",
    );
  });

  it("recognises rate-limit rejections", () => {
    expect(mapSignUpError("Rate limit exceeded")).toContain("Too many");
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(mapSignUpError("Something unusual")).toContain("could not be created");
  });
});
