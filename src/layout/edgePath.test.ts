import { describe, expect, it } from "vitest";
import { verticalBranchPath } from "./edgePath";

describe("verticalBranchPath", () => {
  it("starts at the source, ends at the target and bends at the mid height", () => {
    expect(verticalBranchPath(10, 0, 50, 100)).toBe("M 10 0 C 10 50, 50 50, 50 100");
  });

  it("is a straight vertical line when source and target share an x", () => {
    expect(verticalBranchPath(20, 0, 20, 60)).toBe("M 20 0 C 20 30, 20 30, 20 60");
  });
});
