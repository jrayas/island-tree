import { describe, expect, it } from "vitest";
import type { LayoutNode } from "./types";
import { layoutVertical, type VerticalOptions } from "./vertical";

const options: VerticalOptions = { cardWidth: 100, cardHeight: 40, gap: 10, levelGap: 20 };

const node = (id: string, ...children: LayoutNode[]): LayoutNode => ({ id, children });

describe("layoutVertical", () => {
  it("places a single card at the top left", () => {
    const result = layoutVertical(node("a"), options);
    expect(result.positions.get("a")).toEqual({ x: 50, y: 20 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(40);
  });

  it("centres a lone child directly under its parent", () => {
    const result = layoutVertical(node("a", node("b")), options);
    expect(result.positions.get("a")?.x).toBe(result.positions.get("b")?.x);
    expect(result.positions.get("b")?.y).toBe(60 + 20);
    expect(result.height).toBe(100);
  });

  it("centres a parent over two children with the gap between them", () => {
    const result = layoutVertical(node("a", node("b"), node("c")), options);
    const b = result.positions.get("b")!;
    const c = result.positions.get("c")!;
    expect(c.x - b.x).toBe(110);
    expect(result.positions.get("a")?.x).toBe((b.x + c.x) / 2);
    expect(result.width).toBe(210);
  });

  it("gives a wide subtree room so neighbours do not overlap", () => {
    const wide = node("x", node("x1"), node("x2"), node("x3"));
    const result = layoutVertical(node("r", wide, node("y")), options);
    const x3 = result.positions.get("x3")!;
    const y = result.positions.get("y")!;
    expect(y.x - x3.x).toBeGreaterThanOrEqual(options.cardWidth + options.gap);
  });

  it("keeps every card on its level row", () => {
    const result = layoutVertical(node("r", node("a", node("a1")), node("b")), options);
    expect(result.positions.get("r")?.y).toBe(20);
    expect(result.positions.get("a")?.y).toBe(80);
    expect(result.positions.get("b")?.y).toBe(80);
    expect(result.positions.get("a1")?.y).toBe(140);
  });

  it("positions every node exactly once", () => {
    const tree = node("r", node("a", node("a1"), node("a2")), node("b", node("b1")));
    expect(layoutVertical(tree, options).positions.size).toBe(6);
  });
});
