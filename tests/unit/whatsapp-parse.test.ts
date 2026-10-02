import { describe, expect, it } from "vitest";

import {
  extractOrderCode,
  messageEventId,
  parseWebhookPayload,
  phoneLookupKey,
  phoneMatchesOrdersPhone,
  saysPaid,
  skippedEventId,
  statusEventId,
} from "@/lib/whatsapp/parse";

const META_DELIVERY = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "105794372604440",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "919152830189",
              phone_number_id: "105794372604400",
            },
            contacts: [
              { profile: { name: "Anjali Reddy" }, wa_id: "919876543210" },
            ],
            messages: [
              {
                from: "919876543210",
                id: "wamid.HBgMOTE5NzA2OTMyMzQ3MBUCABIYFjFWUjA3WjNx",
                timestamp: "1759413600",
                text: { body: "Hello Sri Vartali Sarees 👋\n\nOrder ID:\nSVS-ORD-20261002-00129" },
                type: "text",
              },
            ],
            statuses: [
              {
                id: "wamid.HBgMOTE5NzA2OTMyMzQ3MBUCABIYFkZXN0cm95",
                status: "delivered",
                timestamp: "1759413601",
                recipient_id: "919876543210",
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("parseWebhookPayload (§44)", () => {
  it("extracts inbound text messages with contact name and phone id", () => {
    const parsed = parseWebhookPayload(META_DELIVERY);

    expect(parsed.messages).toHaveLength(1);
    const message = parsed.messages[0];
    expect(message.wamid).toBe("wamid.HBgMOTE5NzA2OTMyMzQ3MBUCABIYFjFWUjA3WjNx");
    expect(message.fromPhone).toBe("919876543210");
    expect(message.profileName).toBe("Anjali Reddy");
    expect(message.text).toContain("SVS-ORD-20261002-00129");
    expect(message.timestamp).toBe("1759413600");
    expect(message.phoneNumberId).toBe("105794372604400");
    expect(message.raw).toMatchObject({ type: "text" });
  });

  it("extracts status callbacks with their timestamps", () => {
    const parsed = parseWebhookPayload(META_DELIVERY);

    expect(parsed.statuses).toHaveLength(1);
    expect(parsed.statuses[0].status).toBe("delivered");
    expect(parsed.statuses[0].wamid).toBe(
      "wamid.HBgMOTE5NzA2OTMyMzQ3MBUCABIYFkZXN0cm95",
    );
  });

  it("never throws on malformed payloads — empty result, not an exception", () => {
    expect(parseWebhookPayload(null)).toEqual({
      messages: [],
      statuses: [],
      skipped: [],
    });
    expect(parseWebhookPayload("not json")).toEqual({
      messages: [],
      statuses: [],
      skipped: [],
    });
    expect(parseWebhookPayload({ entry: [{ changes: "nope" }] })).toEqual({
      messages: [],
      statuses: [],
      skipped: [],
    });
  });

  it("routes non-text messages to skipped instead of failing", () => {
    const parsed = parseWebhookPayload({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "pnid" },
                messages: [
                  {
                    from: "919876543210",
                    id: "wamid.image1",
                    type: "image",
                    image: { mime_type: "image/jpeg" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(parsed.messages).toHaveLength(0);
    expect(parsed.skipped).toEqual([{ wamid: "wamid.image1", type: "image" }]);
  });

  it("captures the error code on failed status callbacks", () => {
    const parsed = parseWebhookPayload({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: "wamid.dead",
                    status: "failed",
                    timestamp: "1759413602",
                    errors: [{ code: 131047, title: "Re-engagement message" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(parsed.statuses[0].errorCode).toBe("131047");
  });
});

describe("event ids (§44 idempotency keys)", () => {
  it("namespaced and unique per item kind", () => {
    expect(messageEventId("wamid.1")).toBe("message:wamid.1");
    expect(statusEventId("wamid.1", "delivered")).toBe(
      "status:wamid.1:delivered",
    );
    expect(statusEventId("wamid.1", "read")).not.toBe(
      statusEventId("wamid.1", "delivered"),
    );
    expect(skippedEventId("wamid.img", 0)).toBe("skipped:wamid.img");
    expect(skippedEventId(null, 3)).toBe("skipped:unknown:3");
  });
});

describe("extractOrderCode (§3)", () => {
  it("finds the full code in pasted order text and uppercases it", () => {
    expect(extractOrderCode("Order ID:\nSVS-ORD-20261002-00129")).toBe(
      "SVS-ORD-20261002-00129",
    );
    expect(extractOrderCode("my order svs-ord-20261002-00129 thanks")).toBe(
      "SVS-ORD-20261002-00129",
    );
  });

  it("takes the first code when several appear", () => {
    expect(
      extractOrderCode("SVS-ORD-20261002-00129 then SVS-ORD-20261002-00130"),
    ).toBe("SVS-ORD-20261002-00129");
  });

  it("rejects malformed codes", () => {
    expect(extractOrderCode("SVS-ORD-2026102-00129")).toBeNull(); // 7-digit date
    expect(extractOrderCode("SVS-ORD-20261002-0012")).toBeNull(); // 4-digit seq
    expect(extractOrderCode("hello")).toBeNull();
  });
});

describe("phone matching", () => {
  it("last-10-digits equality bridges Meta wa_id and stored phones", () => {
    expect(phoneLookupKey("919876543210")).toBe("9876543210");
    expect(phoneLookupKey("9876543210")).toBe("9876543210");
    expect(phoneLookupKey("+91 98765 43210")).toBe("9876543210");
    expect(phoneLookupKey("12345")).toBeNull();

    expect(phoneMatchesOrdersPhone("919876543210", "9876543210")).toBe(true);
    expect(phoneMatchesOrdersPhone("9876543210", "9876543210")).toBe(true);
    expect(phoneMatchesOrdersPhone("919876543211", "9876543210")).toBe(false);
  });
});

describe("saysPaid (§31)", () => {
  it("matches the word PAID as a standalone token, case-insensitively", () => {
    expect(saysPaid("PAID")).toBe(true);
    expect(saysPaid("paid")).toBe(true);
    expect(saysPaid(" Paid ")).toBe(true);
    expect(saysPaid("PAID.")).toBe(true);
    expect(saysPaid("I have paid ✅")).toBe(true);
  });

  it("does not match embedded or negated words", () => {
    expect(saysPaid("unpaid")).toBe(false);
    expect(saysPaid("prepaid")).toBe(false);
    expect(saysPaid("Hello!")).toBe(false);
    expect(saysPaid("SVS-ORD-20261002-00129")).toBe(false);
  });
});
