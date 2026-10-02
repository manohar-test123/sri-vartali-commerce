import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyMetaSignature } from "@/lib/whatsapp/signature";

const SECRET = "test-app-secret";

function sign(body: string, secret: string = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

const BODY = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ id: "1", changes: [{ value: { messages: [] } }] }],
});

describe("verifyMetaSignature (§46)", () => {
  it("accepts a correctly signed body", () => {
    expect(verifyMetaSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyMetaSignature(`${BODY} `, sign(BODY), SECRET)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    expect(verifyMetaSignature(BODY, sign(BODY, "other-secret"), SECRET)).toBe(
      false,
    );
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyMetaSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyMetaSignature(BODY, "md5=abc", SECRET)).toBe(false);
    expect(verifyMetaSignature(BODY, "sha256=zz", SECRET)).toBe(false);
  });
});
