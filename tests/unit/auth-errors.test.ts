import { describe, expect, it } from "vitest";

import {
  isAuthNetworkFailure,
  otpAuthErrorMessage,
  passwordAuthErrorMessage,
} from "@/lib/account/auth-errors";
import { mapSignUpError } from "@/lib/account/register";

describe("isAuthNetworkFailure", () => {
  it("recognises fetch/network failures (request never reached the provider)", () => {
    for (const message of [
      "fetch failed",
      "Failed to fetch",
      "TypeError: NetworkError when attempting to fetch resource",
      "connect ECONNREFUSED 127.0.0.1:54321",
      "Request timed out",
    ]) {
      expect(isAuthNetworkFailure({ message })).toBe(true);
    }
  });

  it("does not classify provider verdicts as network failures", () => {
    expect(
      isAuthNetworkFailure({ message: "Invalid login credentials", status: 400 }),
    ).toBe(false);
    expect(
      isAuthNetworkFailure({ message: "email_address_invalid", status: 400 }),
    ).toBe(false);
  });
});

describe("passwordAuthErrorMessage", () => {
  it("invalid credentials stay vague — never say which part was wrong", () => {
    expect(
      passwordAuthErrorMessage({ message: "Invalid login credentials", status: 400 }),
    ).toBe("Email or password is incorrect.");
  });

  it("network failure says sign-in is unavailable, not that credentials are wrong", () => {
    const msg = passwordAuthErrorMessage({ message: "fetch failed" });
    expect(msg).toContain("temporarily unavailable");
    expect(msg).not.toContain("incorrect");
  });

  it("unconfirmed email names the actual next step", () => {
    expect(
      passwordAuthErrorMessage({ message: "Email not confirmed" }),
    ).toContain("confirmation link");
  });

  it("send-rate limits are surfaced as retry-later", () => {
    expect(
      passwordAuthErrorMessage({ message: "over_email_send_rate_limit" }),
    ).toContain("wait");
  });
});

describe("otpAuthErrorMessage", () => {
  it("non-deliverable address domains are named (the @svs.local case)", () => {
    expect(
      otpAuthErrorMessage({
        code: "email_address_invalid",
        message: 'Email address "admin1@svs.local" is invalid',
        status: 400,
      }),
    ).toContain("can't receive sign-in links");
  });

  it("network failure says unavailable rather than a generic retry", () => {
    expect(otpAuthErrorMessage({ message: "fetch failed" })).toContain(
      "temporarily unavailable",
    );
  });

  it("email rate limits ask for a minute", () => {
    expect(
      otpAuthErrorMessage({ message: "over_email_send_rate_limit" }),
    ).toContain("wait a minute");
  });

  it("unknown provider failures stay a plain retry", () => {
    expect(otpAuthErrorMessage({ message: "something else" })).toContain(
      "could not be sent",
    );
  });
});

describe("mapSignUpError (Phase 23 branches)", () => {
  it("non-deliverable address domains are named", () => {
    expect(
      mapSignUpError('Email address "x@svs.local" is invalid (email_address_invalid)'),
    ).toContain("can't receive account mails");
  });

  it("network failures read as temporary, not a permanent failure", () => {
    expect(mapSignUpError("fetch failed")).toContain("temporarily unavailable");
  });
});
