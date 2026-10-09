import { describe, expect, it } from "vitest";

import {
  isResolvableWebhookStatus,
  roleChangeGuard,
} from "@/lib/admin/validation";

describe("roleChangeGuard (§6/§45)", () => {
  it("allows ordinary promotions and demotions", () => {
    expect(
      roleChangeGuard({ currentRole: "CUSTOMER", targetRole: "CLIENT_STAFF", activeSuperAdmins: 1 }),
    ).toEqual({ ok: true, noop: false });
    expect(
      roleChangeGuard({ currentRole: "CLIENT_STAFF", targetRole: "CLIENT_OWNER", activeSuperAdmins: 1 }),
    ).toEqual({ ok: true, noop: false });
    expect(
      roleChangeGuard({ currentRole: "CLIENT_OWNER", targetRole: "CUSTOMER", activeSuperAdmins: 1 }),
    ).toEqual({ ok: true, noop: false });
  });

  it("treats same-role writes as no-ops", () => {
    expect(
      roleChangeGuard({ currentRole: "CLIENT_OWNER", targetRole: "CLIENT_OWNER", activeSuperAdmins: 1 }),
    ).toEqual({ ok: true, noop: true });
  });

  it("never demotes the last super admin", () => {
    const result = roleChangeGuard({
      currentRole: "SUPER_ADMIN",
      targetRole: "CUSTOMER",
      activeSuperAdmins: 1,
    });
    expect(result.ok).toBe(false);
  });

  it("allows demoting a super admin when another active one remains", () => {
    expect(
      roleChangeGuard({ currentRole: "SUPER_ADMIN", targetRole: "CLIENT_OWNER", activeSuperAdmins: 2 }),
    ).toEqual({ ok: true, noop: false });
  });

  it("promoting TO super admin is fine even with zero existing ones", () => {
    expect(
      roleChangeGuard({ currentRole: "CLIENT_OWNER", targetRole: "SUPER_ADMIN", activeSuperAdmins: 0 }),
    ).toEqual({ ok: true, noop: false });
  });
});

describe("isResolvableWebhookStatus (§44)", () => {
  it("only stuck intake states may be manually resolved", () => {
    expect(isResolvableWebhookStatus("RECEIVED")).toBe(true);
    expect(isResolvableWebhookStatus("FAILED")).toBe(true);
    expect(isResolvableWebhookStatus("PROCESSED")).toBe(false);
    expect(isResolvableWebhookStatus("DUPLICATE")).toBe(false);
    expect(isResolvableWebhookStatus("WHATEVER")).toBe(false);
  });
});
