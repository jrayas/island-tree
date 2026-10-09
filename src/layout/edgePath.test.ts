import { describe, expect, it } from "vitest";
import {
  branchPath,
  mindMapCurvePath,
  mindMapElbowPath,
  mindMapPath,
  radialBranchPath,
  radialStepPath,
  straightPath,
  verticalBranchPath,
  verticalStepPath,
} from "./edgePath";

/** Pulls the six numbers (start, two control points, end) out of a cubic path string. */
function numbersOf(path: string): number[] {
  return path.replace(/[MCL,]/g, " ").trim().split(/\s+/).map(Number);
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

describe("verticalStepPath and straightPath", () => {
  it("steps down, across and down", () => {
    expect(verticalStepPath(10, 0, 50, 100)).toBe("M 10 0 L 10 50 L 50 50 L 50 100");
  });

  it("draws a plain line", () => {
    expect(straightPath(1, 2, 3, 4)).toBe("M 1 2 L 3 4");
  });
});

describe("radialStepPath", () => {
  it("goes along the parent's spoke, across at the mid radius, and in along the child's", () => {
    const n = numbersOf(radialStepPath({ x: 0, y: 0 }, 100, 0, 0, 200));
    expect([n[0], n[1]]).toEqual([100, 0]);
    expect(n[2]).toBeCloseTo(150);
    expect(n[3]).toBeCloseTo(0);
    expect(n[4]).toBeCloseTo(0);
    expect(n[5]).toBeCloseTo(150);
    expect([n[6], n[7]]).toEqual([0, 200]);
  });

  it("borrows the child's angle when the parent is on the centre", () => {
    const n = numbersOf(radialStepPath({ x: 0, y: 0 }, 0, 0, 0, 100));
    expect(n[2]).toBeCloseTo(0);
    expect(n[3]).toBeCloseTo(50);
  });
});

describe("branchPath", () => {
  const centre = { x: 0, y: 0 };

  it("picks the vertical or radial shape for each style", () => {
    expect(branchPath("curved", null, 10, 0, 50, 100)).toBe(verticalBranchPath(10, 0, 50, 100));
    expect(branchPath("step", null, 10, 0, 50, 100)).toBe(verticalStepPath(10, 0, 50, 100));
    expect(branchPath("curved", centre, 100, 0, 0, 200)).toBe(radialBranchPath(centre, 100, 0, 0, 200));
    expect(branchPath("step", centre, 100, 0, 0, 200)).toBe(radialStepPath(centre, 100, 0, 0, 200));
  });

  it("draws a plain line for the straight style in either layout", () => {
    expect(branchPath("straight", null, 1, 2, 3, 4)).toBe("M 1 2 L 3 4");
    expect(branchPath("straight", centre, 1, 2, 3, 4)).toBe("M 1 2 L 3 4");
  });
});

describe("mind map branches", () => {
  it("leaves and arrives horizontally, with the control points on the middle column line", () => {
    const [sx, sy, c1x, c1y, c2x, c2y, tx, ty] = numbersOf(mindMapCurvePath(0, 0, 100, 40));
    expect([sx, sy, tx, ty]).toEqual([0, 0, 100, 40]);
    expect([c1x, c1y]).toEqual([50, 0]);
    expect([c2x, c2y]).toEqual([50, 40]);
  });

  it("runs the S-curve backwards for the left side", () => {
    const [sx, , c1x, , c2x, , tx] = numbersOf(mindMapCurvePath(0, 0, -100, 40));
    expect(sx).toBe(0);
    expect(c1x).toBe(-50);
    expect(c2x).toBe(-50);
    expect(tx).toBe(-100);
  });

  it("makes an elbow with rounded corners and no diagonals", () => {
    const path = mindMapElbowPath(0, 0, 100, 60, 10);
    expect(path).toBe("M 0 0 L 40 0 Q 50 0, 50 10 L 50 50 Q 50 60, 60 60 L 100 60");
  });

  it("makes an upward elbow, and shrinks the corner when the cards are close", () => {
    expect(mindMapElbowPath(0, 60, 100, 0, 10)).toBe("M 0 60 L 40 60 Q 50 60, 50 50 L 50 10 Q 50 0, 60 0 L 100 0");
    expect(mindMapElbowPath(0, 0, 100, 6, 10)).toContain("Q 50 0, 50 3");
  });

  it("is a plain line when the cards are level", () => {
    expect(mindMapElbowPath(0, 20, 100, 20)).toBe("M 0 20 L 100 20");
  });

  it("goes from the parent's right edge to the child's left edge on the right side", () => {
    // Cards 100 wide, centres 160 apart: the edges are at 50 and 110.
    const [sx, , , , , , tx] = numbersOf(mindMapPath("curved", "right", 100, 0, 0, 160, 40));
    expect(sx).toBe(50);
    expect(tx).toBe(110);
  });

  it("goes from the parent's left edge to the child's right edge on the left side", () => {
    const [sx, , , , , , tx] = numbersOf(mindMapPath("curved", "left", 100, 0, 0, -160, 40));
    expect(sx).toBe(-50);
    expect(tx).toBe(-110);
  });

  it("uses elbows for step, and the S-curve for curved and straight", () => {
    expect(mindMapPath("step", "right", 100, 0, 0, 160, 40)).toContain("Q");
    expect(mindMapPath("straight", "right", 100, 0, 0, 160, 40)).toBe(mindMapPath("curved", "right", 100, 0, 0, 160, 40));
  });
});
