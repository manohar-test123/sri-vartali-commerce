import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  BRAND_LOGO_ALT,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_SRC,
  BRAND_LOGO_WIDTH,
  brandAssetPaths,
} from "@/lib/storefront/brand";

/** The suite runs from the repo root in CI and from it in local dev. */
const repoRoot = process.cwd();

/** PNG IHDR: width/height are big-endian at bytes 16..24. */
function pngDimensions(buf: Buffer): { width: number; height: number } {
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

/** Minimal JPEG scan: find the first SOF marker and read its frame dims. */
function jpegDimensions(buf: Buffer): { width: number; height: number } {
  let offset = 2; // skip SOI
  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    const length = buf.readUInt16BE(offset + 2);
    if (isSof) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error("no JPEG SOF marker found");
}

describe("official logo constants (Phase 21)", () => {
  it("points at the owner-provided lockup with a descriptive alt", () => {
    expect(BRAND_LOGO_SRC).toBe("/brand/logo-official.jpg");
    expect(BRAND_LOGO_ALT).toBe("Sri Vartali Sarees");
  });

  it("declares the landscape lockup aspect", () => {
    expect(BRAND_LOGO_WIDTH / BRAND_LOGO_HEIGHT).toBeGreaterThan(1.5);
    expect(BRAND_LOGO_WIDTH / BRAND_LOGO_HEIGHT).toBeLessThan(2);
  });
});

describe("official logo assets on disk", () => {
  it("every declared asset exists in the repo", () => {
    for (const file of brandAssetPaths(repoRoot)) {
      expect(existsSync(file), `${file} is missing`).toBe(true);
    }
  });

  it("the lockup's real JPEG dimensions match the render constants", () => {
    const file = path.join(repoRoot, "public", "brand", "logo-official.jpg");
    const { width, height } = jpegDimensions(readFileSync(file));
    // processed with slight padding tolerance — exact frame or within 2px
    expect(Math.abs(width - BRAND_LOGO_WIDTH)).toBeLessThanOrEqual(2);
    expect(Math.abs(height - BRAND_LOGO_HEIGHT)).toBeLessThanOrEqual(2);
  });

  it("the favicon is a square PNG", () => {
    const file = path.join(repoRoot, "app", "icon.png");
    const buf = readFileSync(file);
    expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
    const { width, height } = pngDimensions(buf);
    expect(width).toBe(height);
    expect(width).toBeGreaterThanOrEqual(256);
  });
});
