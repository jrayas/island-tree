import { describe, expect, it } from "vitest";
import { layoutRadial, radiusToClear, ringRadius, type RadialOptions } from "./radial";
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

describe("radiusToClear", () => {
  const turn = (n: number): number[] => Array.from({ length: n }, (_, i) => (2 * Math.PI * i) / n);

  it("needs nothing for a ring with one card or none", () => {
    expect(radiusToClear([], 80, 30, 0)).toBe(0);
    expect(radiusToClear([1], 80, 30, 0)).toBe(0);
  });

  it("asks for a bigger ring the more cards share it", () => {
    expect(radiusToClear(turn(40), 80, 30, 0)).toBeGreaterThan(radiusToClear(turn(10), 80, 30, 0));
  });

  it("keeps neighbours apart by at least the card size", () => {
    const angles = turn(24);
    const radius = radiusToClear(angles, 80, 30, 0);
    // Compare real card rectangles: they must not overlap at the radius it gives.
    const box = (angle: number): { x: number; y: number } => ({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    for (let i = 0; i < angles.length; i++) {
      const a = box(angles[i]);
      const b = box(angles[(i + 1) % angles.length]);
      const overlaps = Math.abs(a.x - b.x) < 80 - 1e-6 && Math.abs(a.y - b.y) < 30 - 1e-6;
      expect(overlaps).toBe(false);
    }
  });

  it("adds the gap between neighbours", () => {
    expect(radiusToClear(turn(24), 80, 30, 10)).toBeGreaterThan(radiusToClear(turn(24), 80, 30, 0));
  });
});

describe("layoutRadial with crowded rings", () => {
  const many = (n: number): LayoutNode => node("r", ...Array.from({ length: n }, (_, i) => node(`c${i}`)));
  const crowded: RadialOptions = { ...options, cardWidth: 80, cardHeight: 30, gap: 5 };

  const overlapping = (result: ReturnType<typeof layoutRadial>, width: number, height: number): number => {
    const points = [...result.positions.values()];
    let count = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        if (Math.abs(a.x - b.x) < width - 1e-6 && Math.abs(a.y - b.y) < height - 1e-6) count++;
      }
    }
    return count;
  };

  it("overlaps when the rings are left as configured and there are too many cards", () => {
    expect(overlapping(layoutRadial(many(40), options), 80, 30)).toBeGreaterThan(0);
  });

  it("pushes the ring out until no two cards overlap", () => {
    const result = layoutRadial(many(40), crowded);
    expect(overlapping(result, 80, 30)).toBe(0);
    const centre = result.centre!;
    const p = result.positions.get("c0")!;
    expect(Math.hypot(p.x - centre.x, p.y - centre.y)).toBeGreaterThan(100);
  });

  it("leaves a ring alone when its cards already have room", () => {
    const result = layoutRadial(many(4), crowded);
    const centre = result.centre!;
    const p = result.positions.get("c0")!;
    expect(Math.hypot(p.x - centre.x, p.y - centre.y)).toBeCloseTo(100);
  });

  it("keeps the rings beyond a pushed-out one the same distance further out", () => {
    const tree = node("r", ...Array.from({ length: 40 }, (_, i) => node(`c${i}`, node(`d${i}`))));
    const result = layoutRadial(tree, crowded);
    const centre = result.centre!;
    const distance = (id: string): number => {
      const p = result.positions.get(id)!;
      return Math.hypot(p.x - centre.x, p.y - centre.y);
    };
    expect(distance("d0") - distance("c0")).toBeGreaterThanOrEqual(100 - 1e-6);
    expect(overlapping(result, 80, 30)).toBe(0);
  });

  it("makes the square big enough for a pushed-out ring", () => {
    const result = layoutRadial(many(40), crowded);
    const centre = result.centre!;
    for (const p of result.positions.values()) {
      expect(p.x - 40).toBeGreaterThanOrEqual(0);
      expect(p.x + 40).toBeLessThanOrEqual(result.width + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(result.height + 1e-6);
    }
    expect(centre.x).toBeCloseTo(result.width / 2);
  });
});
