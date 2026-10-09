import { describe, expect, it } from "vitest";
import { layoutMindMap, splitBranches, type MindMapOptions } from "./mindmap";
import type { LayoutNode } from "./types";

const leaf = (id: string): LayoutNode => ({ id, children: [] });
const node = (id: string, ...children: LayoutNode[]): LayoutNode => ({ id, children });

const options: MindMapOptions = { cardWidth: 100, cardHeight: 40, rowGap: 10, columnGap: 60, view: "balanced" };
const STEP = 160; // card width + column gap

describe("splitBranches", () => {
  it("handles no, one and two branches", () => {
    expect(splitBranches([], 10)).toBe(0);
    expect(splitBranches([40], 10)).toBe(1);
    expect(splitBranches([40, 40], 10)).toBe(1);
  });

  it("splits equal branches down the middle", () => {
    expect(splitBranches([40, 40, 40, 40], 10)).toBe(2);
  });

  it("gives the right side the extra branch when it is a tie", () => {
    expect(splitBranches([40, 40, 40], 10)).toBe(2);
  });

  it("weighs a big branch against several small ones, keeping the order", () => {
    // One tall branch first: it alone balances the three small ones after it.
    expect(splitBranches([170, 40, 40, 40], 10)).toBe(1);
    // Small ones first, the tall one last.
    expect(splitBranches([40, 40, 40, 170], 10)).toBe(3);
  });

  it("is not a simple alternation", () => {
    // Five branches where the last one is huge: only it goes left.
    expect(splitBranches([40, 40, 40, 40, 400], 10)).toBe(4);
  });
});

describe("layoutMindMap, balanced", () => {
  const tree = node("root", leaf("a"), leaf("b"), leaf("c"), leaf("d"));
  const result = layoutMindMap(tree, options);
  const at = (id: string) => result.positions.get(id)!;

  it("puts the root between the two sides and in the vertical middle", () => {
    expect(at("root").y).toBeCloseTo(result.height / 2);
    expect(at("a").x).toBeGreaterThan(at("root").x);
    expect(at("d").x).toBeLessThan(at("root").x);
  });

  it("gives each side two branches, mirrored, one column away", () => {
    expect(result.sides!.get("a")).toBe("right");
    expect(result.sides!.get("b")).toBe("right");
    expect(result.sides!.get("c")).toBe("left");
    expect(result.sides!.get("d")).toBe("left");
    expect(at("a").x - at("root").x).toBeCloseTo(STEP);
    expect(at("root").x - at("c").x).toBeCloseTo(STEP);
  });

  it("stacks a side evenly around the root's centre line", () => {
    expect((at("a").y + at("b").y) / 2).toBeCloseTo(at("root").y);
    expect((at("c").y + at("d").y) / 2).toBeCloseTo(at("root").y);
    expect(at("b").y - at("a").y).toBeCloseTo(50);
  });

  it("reads clockwise: the left side continues from the bottom up", () => {
    expect(at("c").y).toBeGreaterThan(at("d").y);
  });

  it("starts at 0, 0 and reports its size", () => {
    const xs = [...result.positions.values()].map((p) => p.x);
    expect(Math.min(...xs) - 50).toBeCloseTo(0);
    expect(result.width).toBeCloseTo(2 * STEP + 100);
    expect(result.centre).toBeNull();
  });

  it("keeps the root in the middle of the frame even when one side is shallower", () => {
    // One branch with a deep chain goes right; the other is a lone file on the left.
    const lopsided = node("root", node("a", node("a1", leaf("a2"))), leaf("b"));
    const r = layoutMindMap(lopsided, options);
    const rootX = r.positions.get("root")!.x;
    expect(r.frame).toEqual({ x: 0, y: 0, width: r.width, height: r.height });
    expect(rootX).toBeCloseTo(r.width / 2);
    expect(r.positions.get("root")!.y).toBeCloseTo(r.height / 2);
    expect(r.width).toBeCloseTo(2 * 3 * STEP + 100);
  });

  it("goes further out at each level and keeps parents centred on their children", () => {
    const deep = node("root", node("a", leaf("a1"), leaf("a2")), node("b", leaf("b1")));
    const r = layoutMindMap(deep, options);
    const p = (id: string) => r.positions.get(id)!;
    // Two branches: a on the right, b on the left.
    expect(p("a1").x - p("a").x).toBeCloseTo(STEP);
    expect(p("b").x - p("b1").x).toBeCloseTo(STEP);
    expect((p("a1").y + p("a2").y) / 2).toBeCloseTo(p("a").y);
    expect(p("b1").y).toBeCloseTo(p("b").y);
  });

  it("never overlaps cards in the same column, even with many children", () => {
    const wide = node(
      "root",
      ...Array.from({ length: 30 }, (_, i) => node(`f${i}`, leaf(`f${i}a`), leaf(`f${i}b`))),
    );
    const r = layoutMindMap(wide, options);
    const byColumn = new Map<number, number[]>();
    for (const { x, y } of r.positions.values()) {
      const key = Math.round(x);
      byColumn.set(key, [...(byColumn.get(key) ?? []), y]);
    }
    for (const ys of byColumn.values()) {
      ys.sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) {
        expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(40 + 10 - 1e-9);
      }
    }
  });

  it("lays out a root with no children, and a root with one child", () => {
    expect(layoutMindMap(leaf("only"), options).positions.size).toBe(1);
    const single = layoutMindMap(node("root", leaf("a")), options);
    expect(single.sides!.get("a")).toBe("right");
    expect(single.positions.get("a")!.y).toBeCloseTo(single.positions.get("root")!.y);
  });
});

describe("layoutMindMap, one-sided", () => {
  const tree = node("root", node("a", leaf("a1"), leaf("a2"), leaf("a3")), leaf("b"), node("c", leaf("c1")));
  const result = layoutMindMap(tree, { ...options, view: "oneSided" });
  const at = (id: string) => result.positions.get(id)!;

  it("puts the root at the far left and every level one column further right", () => {
    expect(at("root").x).toBeCloseTo(50);
    expect(at("a").x - at("root").x).toBeCloseTo(STEP);
    expect(at("a1").x - at("a").x).toBeCloseTo(STEP);
    expect(at("b").x).toBeCloseTo(at("a").x);
    expect([...result.sides!.values()].every((s) => s === "right")).toBe(true);
  });

  it("centres the root on the whole tree and each parent on its group", () => {
    expect(at("root").y).toBeCloseTo(result.height / 2);
    expect((at("a1").y + at("a3").y) / 2).toBeCloseTo(at("a").y);
    expect(at("c1").y).toBeCloseTo(at("c").y);
  });

  it("lines the deepest leaves up in the last column", () => {
    expect(at("a1").x).toBeCloseTo(at("c1").x);
    expect(Math.max(...[...result.positions.values()].map((p) => p.x))).toBeCloseTo(at("a1").x);
  });

  it("has no special frame, so the camera frames the cards themselves", () => {
    expect(result.frame).toBeUndefined();
  });
});
