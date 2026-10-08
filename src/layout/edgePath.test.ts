import { describe, expect, it } from "vitest";
import { radialBranchPath, verticalBranchPath } from "./edgePath";

/** Pulls the six numbers (start, two control points, end) out of a cubic path string. */
function numbersOf(path: string): number[] {
  return path.replace(/[MC,]/g, " ").trim().split(/\s+/).map(Number);
}

describe("verticalBranchPath", () => {
  it("starts at the source, ends at the target and bends at the mid height", () => {
    expect(verticalBranchPath(10, 0, 50, 100)).toBe("M 10 0 C 10 50, 50 50, 50 100");
  });

  it("is a straight vertical line when source and target share an x", () => {
    expect(verticalBranchPath(20, 0, 20, 60)).toBe("M 20 0 C 20 30, 20 30, 20 60");
  });
});

describe("radialBranchPath", () => {
  const centre = { x: 0, y: 0 };

  it("starts and ends at the two cards", () => {
    const n = numbersOf(radialBranchPath(centre, 100, 0, 0, 200));
    expect([n[0], n[1]]).toEqual([100, 0]);
    expect([n[6], n[7]]).toEqual([0, 200]);
  });

  it("puts the control points on the mid radius at each card's angle", () => {
    // Parent on the right at radius 100, child below at radius 200: mid radius is 150.
    const n = numbersOf(radialBranchPath(centre, 100, 0, 0, 200));
    expect(n[2]).toBeCloseTo(150);
    expect(n[3]).toBeCloseTo(0);
    expect(n[4]).toBeCloseTo(0);
    expect(n[5]).toBeCloseTo(150);
  });

  it("uses the child's angle when the parent is on the centre", () => {
    const n = numbersOf(radialBranchPath(centre, 0, 0, 0, 100));
    // Mid radius is 50 and both control points lie on the child's spoke, straight down.
    expect(n[2]).toBeCloseTo(0);
    expect(n[3]).toBeCloseTo(50);
    expect(n[4]).toBeCloseTo(0);
    expect(n[5]).toBeCloseTo(50);
  });
});
