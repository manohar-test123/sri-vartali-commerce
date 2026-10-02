import { describe, expect, it } from "vitest";

import { productMediaFolder, signCloudinaryParams } from "@/lib/media/cloudinary";

/**
 * Vectors are independent (computed with Python hashlib, not the module) —
 * they pin the Cloudinary signature algorithm: sha1(sorted k=v&… + secret).
 */
describe("signCloudinaryParams", () => {
  it("signs sorted parameters with the api secret", () => {
    expect(
      signCloudinaryParams(
        { timestamp: "1234567890", folder: "svs/products/abc" },
        "test-secret",
      ),
    ).toBe("4a43891207cf0116ad1383e21231594997ccb456");
  });

  it("signs a timestamp-only payload", () => {
    expect(signCloudinaryParams({ timestamp: "1700000000" }, "nk")).toBe(
      "5bced43b31083ded1cadbd108d1dde3d0ccfd0fc",
    );
  });

  it("changes when the secret changes", () => {
    const params = { timestamp: "1" };
    expect(signCloudinaryParams(params, "a")).not.toBe(
      signCloudinaryParams(params, "b"),
    );
  });
});

describe("productMediaFolder", () => {
  it("scopes uploads under the product code", () => {
    expect(productMediaFolder("SVS-P-000121")).toBe("svs/products/SVS-P-000121");
  });
});
