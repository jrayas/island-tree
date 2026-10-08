import { describe, expect, it } from "vitest";
import { layoutRadial, ringRadius, type RadialOptions } from "./radial";
import type { LayoutNode } from "./types";

const options: RadialOptions = {
  cardWidth: 80,
  radii: [0, 100, 200],
  ringStep: 50,
  margin: 10,
};

const node = (id: string, ...children: LayoutNode[]): LayoutNode => ({ id, children });

describe("ringRadius", () => {
  it("uses the configured radii first", () => {
    expect(ringRadius(0, [0, 100, 200], 50)).toBe(0);
    expect(ringRadius(2, [0, 100, 200], 50)).toBe(200);
  });

  it("adds a fixed step for each ring beyond the configured ones", () => {
    expect(ringRadius(3, [0, 100, 200], 50)).toBe(250);
    expect(ringRadius(5, [0, 100, 200], 50)).toBe(350);
  });

  it("scales every radius", () => {
    expect(ringRadius(1, [0, 100, 200], 50, 1.3)).toBeCloseTo(130);
    expect(ringRadius(3, [0, 100, 200], 50, 2)).toBe(500);
  });
});

describe("layoutRadial", () => {
  it("puts a lone root at the centre of a square just big enough for it", () => {
    const result = layoutRadial(node("r"), options);
    expect(result.width).toBe(result.height);
    expect(result.width).toBe(2 * (0 + 40 + 10));
    expect(result.positions.get("r")).toEqual(result.centre);
  });

  it("places the root at the centre and a lone child straight below it", () => {
    const result = layoutRadial(node("r", node("a")), options);
    const centre = result.centre!;
    const a = result.positions.get("a")!;
    expect(result.positions.get("r")).toEqual(centre);
    expect(a.x).toBeCloseTo(centre.x);
    expect(a.y).toBeCloseTo(centre.y + 100);
  });

  it("spreads two equal children to opposite sides", () => {
    const result = layoutRadial(node("r", node("a"), node("b")), options);
    const centre = result.centre!;
    const a = result.positions.get("a")!;
    const b = result.positions.get("b")!;
    expect(a.x - centre.x).toBeCloseTo(-(b.x - centre.x));
    expect(a.y - centre.y).toBeCloseTo(-(b.y - centre.y));
  });

  it("puts every card on the ring for its depth", () => {
    const tree = node("r", node("a", node("a1"), node("a2")), node("b"));
    const result = layoutRadial(tree, options);
    const centre = result.centre!;
    const distance = (id: string): number => {
      const p = result.positions.get(id)!;
      return Math.hypot(p.x - centre.x, p.y - centre.y);
    };
    expect(distance("a")).toBeCloseTo(100);
    expect(distance("b")).toBeCloseTo(100);
    expect(distance("a1")).toBeCloseTo(200);
    expect(distance("a2")).toBeCloseTo(200);
  });

  it("gives a busier branch a larger share of the angle", () => {
    // "a" has three leaves and "b" has one, so a's children span three quarters of the turn.
    const tree = node("r", node("a", node("a1"), node("a2"), node("a3")), node("b"));
    const result = layoutRadial(tree, options);
    const centre = result.centre!;
    const angle = (id: string): number => {
      const p = result.positions.get(id)!;
      return Math.atan2(p.y - centre.y, p.x - centre.x);
    };
    const gap = (x: number, y: number): number => {
      const d = Math.abs(x - y) % (2 * Math.PI);
      return Math.min(d, 2 * Math.PI - d);
    };
    // Neighbours inside the busy branch are 90 degrees apart; the lone sibling's slice is 90 degrees wide too.
    expect(gap(angle("a1"), angle("a2"))).toBeCloseTo(Math.PI / 2);
    expect(gap(angle("a2"), angle("a3"))).toBeCloseTo(Math.PI / 2);
  });

  it("starts the sweep straight up", () => {
    // With the root's whole turn split in two, the first child's slice starts at the top
    // and its middle is a quarter turn clockwise (to the right) of it.
    const result = layoutRadial(node("r", node("a"), node("b")), options);
    const centre = result.centre!;
    const a = result.positions.get("a")!;
    expect(a.x).toBeGreaterThan(centre.x - 1e-9);
    expect(a.y).toBeCloseTo(centre.y);
  });

  it("makes room for the outermost ring", () => {
    const result = layoutRadial(node("r", node("a", node("a1", node("a2")))), options);
    // depth 3 uses the step beyond the last configured ring: 200 + 50.
    expect(result.width).toBe(2 * (250 + 40 + 10));
  });

  it("positions every node exactly once", () => {
    const tree = node("r", node("a", node("a1")), node("b"), node("c"));
    expect(layoutRadial(tree, options).positions.size).toBe(5);
  });
});
