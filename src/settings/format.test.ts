import { describe, expect, it } from "vitest";
import { formatNumber, previewGrid } from "./format";
import type { NumberDef } from "./schema";

const px: NumberDef = { kind: "number", min: 0, max: 10, step: 1, default: 5, unit: "px" };

describe("formatNumber", () => {
  it("adds the unit", () => {
    expect(formatNumber(px, 12)).toBe("12 px");
  });

  it("writes a bare number when there is no unit", () => {
    expect(formatNumber({ ...px, unit: undefined }, 6)).toBe("6");
  });

  it("says what zero means when it has a special meaning", () => {
    expect(formatNumber({ ...px, zeroMeans: "the theme size" }, 0)).toBe("the theme size");
    expect(formatNumber({ ...px, zeroMeans: "the theme size" }, 3)).toBe("3 px");
  });

  it("keeps the unit for a zero that means nothing special", () => {
    expect(formatNumber(px, 0)).toBe("0 px");
  });
});

describe("previewGrid", () => {
  it("draws dots with the spacing as the cell size", () => {
    const grid = previewGrid("dots", 1.2, 22);
    expect(grid.image).toContain("radial-gradient");
    expect(grid.size).toBe("22px 22px");
  });

  it("draws lines in both directions", () => {
    const grid = previewGrid("lines", 1, 30);
    expect(grid.image.match(/linear-gradient/g)).toHaveLength(2);
    expect(grid.size).toBe("30px 30px");
  });

  it("draws nothing for none", () => {
    expect(previewGrid("none", 1, 22)).toEqual({ image: "none", size: "auto" });
  });
});
