import { describe, expect, it } from "vitest";

import { moveItem } from "@/lib/catalog/media-order";

describe("moveItem (§58 reorder images)", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves an item earlier", () => {
    expect(moveItem(ids, 2, 0)).toEqual(["c", "a", "b", "d"]);
  });

  it("moves an item later", () => {
    expect(moveItem(ids, 0, 3)).toEqual(["b", "c", "d", "a"]);
  });

  it("swaps neighbours", () => {
    expect(moveItem(ids, 1, 2)).toEqual(["a", "c", "b", "d"]);
  });

  it("no-op and out-of-range inputs return the same order", () => {
    expect(moveItem(ids, 1, 1)).toEqual(ids);
    expect(moveItem(ids, -1, 0)).toEqual(ids);
    expect(moveItem(ids, 0, 99)).toEqual(ids);
    expect(moveItem(ids, 99, 0)).toEqual(ids);
  });

  it("never mutates the input array", () => {
    const input = ["a", "b", "c"];
    moveItem(input, 0, 2);
    expect(input).toEqual(["a", "b", "c"]);
  });

  it("empty and single-item lists pass through", () => {
    expect(moveItem([], 0, 0)).toEqual([]);
    expect(moveItem(["only"], 0, 0)).toEqual(["only"]);
  });
});
