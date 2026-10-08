import { describe, expect, it } from "vitest";
import { easeFactor, seedPositions, stepPositions } from "./animate";
import type { Point } from "./types";

const map = (entries: [string, Point][]): Map<string, Point> => new Map(entries);

describe("easeFactor", () => {
  it("is the base fraction for one 60 Hz frame", () => {
    expect(easeFactor(1000 / 60)).toBeCloseTo(0.2, 5);
  });

  it("covers more distance on a longer frame and none on a zero or bad frame", () => {
    expect(easeFactor(100)).toBeGreaterThan(easeFactor(16));
    expect(easeFactor(0)).toBe(0);
    expect(easeFactor(-5)).toBe(0);
    expect(easeFactor(Number.NaN)).toBe(0);
  });

  it("stays below 1 so cards never overshoot", () => {
    expect(easeFactor(10_000)).toBeLessThanOrEqual(1);
  });
});

describe("seedPositions", () => {
  const targets = map([
    ["root", { x: 100, y: 0 }],
    ["a", { x: 50, y: 60 }],
    ["b", { x: 150, y: 60 }],
  ]);
  const order = [
    { id: "root", parentId: null },
    { id: "a", parentId: "root" },
    { id: "b", parentId: "root" },
  ];

  it("keeps existing positions and starts new cards at their parent", () => {
    const current = map([["root", { x: 80, y: 5 }]]);
    const seeded = seedPositions(current, targets, order);
    expect(seeded.get("root")).toEqual({ x: 80, y: 5 });
    expect(seeded.get("a")).toEqual({ x: 80, y: 5 });
    expect(seeded.get("b")).toEqual({ x: 80, y: 5 });
  });

  it("starts a new root at its own target", () => {
    const seeded = seedPositions(new Map(), targets, order);
    expect(seeded.get("root")).toEqual({ x: 100, y: 0 });
  });

  it("drops cards that are no longer present", () => {
    const current = map([
      ["root", { x: 1, y: 1 }],
      ["gone", { x: 9, y: 9 }],
    ]);
    expect(seedPositions(current, targets, order).has("gone")).toBe(false);
  });

  it("does not share point objects with the parent", () => {
    const seeded = seedPositions(map([["root", { x: 1, y: 1 }]]), targets, order);
    expect(seeded.get("a")).not.toBe(seeded.get("root"));
  });
});

describe("stepPositions", () => {
  it("moves part of the way and reports not settled", () => {
    const result = stepPositions(
      map([["a", { x: 0, y: 0 }]]),
      map([["a", { x: 100, y: 0 }]]),
      0.2,
    );
    expect(result.positions.get("a")).toEqual({ x: 20, y: 0 });
    expect(result.settled).toBe(false);
  });

  it("snaps to the target within epsilon and settles", () => {
    const result = stepPositions(
      map([["a", { x: 99.8, y: 0 }]]),
      map([["a", { x: 100, y: 0 }]]),
      0.2,
    );
    expect(result.positions.get("a")).toEqual({ x: 100, y: 0 });
    expect(result.settled).toBe(true);
  });

  it("treats a missing current position as already at the target", () => {
    const result = stepPositions(new Map(), map([["a", { x: 5, y: 5 }]]), 0.2);
    expect(result.positions.get("a")).toEqual({ x: 5, y: 5 });
    expect(result.settled).toBe(true);
  });

  it("jumps straight to the target when the factor is 1", () => {
    const result = stepPositions(
      map([["a", { x: 0, y: 0 }]]),
      map([["a", { x: 40, y: 30 }]]),
      1,
    );
    expect(result.positions.get("a")).toEqual({ x: 40, y: 30 });
  });

  it("only returns positions for current targets", () => {
    const result = stepPositions(
      map([["old", { x: 0, y: 0 }]]),
      map([["a", { x: 1, y: 1 }]]),
      0.2,
    );
    expect(result.positions.has("old")).toBe(false);
  });
});
