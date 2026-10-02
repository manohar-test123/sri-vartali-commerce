import { describe, expect, it } from "vitest";

import {
  mapPostalPincodeResponse,
  unwrapPostalPayload,
} from "@/lib/checkout/pincode";

const successPayload = {
  Message: "4 Post Office(s) found",
  Status: "Success",
  PostOffice: [
    { Name: "Banjara Hills", District: "Hyderabad", State: "Telangana", Block: "Shaikpet" },
    { Name: "Banjara Hills", District: "Hyderabad", State: "Telangana", Block: "Shaikpet" },
    { Name: "Nanakramguda", District: "Hyderabad", State: "Telangana", Block: "Serilingampally" },
  ],
};

describe("unwrapPostalPayload", () => {
  it("unwraps the array envelope the API actually returns (regression: bare-envelope reads saw every PIN as not found)", () => {
    const wrapped = [successPayload];
    expect(unwrapPostalPayload(wrapped)).toEqual(successPayload);
    expect(unwrapPostalPayload(successPayload)).toEqual(successPayload);
  });

  it("an empty array unwraps to an empty envelope (→ not found, not a crash)", () => {
    expect(unwrapPostalPayload([])).toEqual({});
  });
});
describe("mapPostalPincodeResponse (§21)", () => {
  it("maps a success payload to state, district and deduped post offices", () => {
    const result = mapPostalPincodeResponse("500034", successPayload);
    expect(result.ok).toBe(true);
    expect(result.lookup).toEqual({
      pin: "500034",
      state: "Telangana",
      district: "Hyderabad",
      postOffices: ["Banjara Hills", "Nanakramguda"],
    });
  });

  it("reports not_found on a non-Success status", () => {
    const result = mapPostalPincodeResponse("999999", {
      Message: "No records found",
      Status: "Error",
      PostOffice: null,
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("survives a Success status with a null PostOffice list", () => {
    const result = mapPostalPincodeResponse("500034", {
      Status: "Success",
      PostOffice: null,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_found");
  });

  it("keeps the order of post offices and trims padding", () => {
    const result = mapPostalPincodeResponse("110001", {
      Status: "Success",
      PostOffice: [
        { Name: "  Connaught Place ", District: " New Delhi ", State: " Delhi " },
        { Name: "Janpath", District: "New Delhi", State: "Delhi" },
      ],
    });
    expect(result.lookup!.postOffices).toEqual(["Connaught Place", "Janpath"]);
    expect(result.lookup!.state).toBe("Delhi");
    expect(result.lookup!.district).toBe("New Delhi");
  });

  it("an empty post office list maps to empty options, not an error", () => {
    const result = mapPostalPincodeResponse("500034", {
      Status: "Success",
      PostOffice: [],
    });
    expect(result.ok).toBe(true);
    expect(result.lookup!.postOffices).toEqual([]);
    expect(result.lookup!.state).toBeNull();
    expect(result.lookup!.district).toBeNull();
  });
});
