import { describe, expect, it } from "vitest";
import { clampNumber } from "./defaults";

describe("clampNumber", () => {
  it("returns values already in range unchanged", () => {
    expect(clampNumber(5, 0, 10, 3)).toBe(5);
  });

  it("clamps values below the minimum and above the maximum", () => {
    expect(clampNumber(-4, 0, 10, 3)).toBe(0);
    expect(clampNumber(99, 0, 10, 3)).toBe(10);
  });

  it("accepts the range limits themselves", () => {
    expect(clampNumber(0, 0, 10, 3)).toBe(0);
    expect(clampNumber(10, 0, 10, 3)).toBe(10);
  });

  it("falls back for non-numbers and non-finite numbers", () => {
    expect(clampNumber("7", 0, 10, 3)).toBe(3);
    expect(clampNumber(undefined, 0, 10, 3)).toBe(3);
    expect(clampNumber(null, 0, 10, 3)).toBe(3);
    expect(clampNumber(Number.NaN, 0, 10, 3)).toBe(3);
    expect(clampNumber(Number.POSITIVE_INFINITY, 0, 10, 3)).toBe(3);
  });
});
