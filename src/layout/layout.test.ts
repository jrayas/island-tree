import { describe, expect, it } from "vitest";
import { CARD_SIZES, DETAILED_CARD_SIZES, cardSizeFor, computeLayout } from "./layout";
import type { LayoutNode } from "./types";

const tree: LayoutNode = {
  id: "r",
  children: [
    { id: "a", children: [] },
    { id: "b", children: [] },
  ],
};

describe("computeLayout", () => {
  it("uses the vertical engine and its card size in vertical mode", () => {
    const result = computeLayout("vertical", tree);
    expect(result.cardSize).toEqual(CARD_SIZES.vertical);
    expect(result.centre).toBeNull();
    expect(result.positions.get("a")?.y).toBe(result.positions.get("b")?.y);
  });

  it("uses the radial engine and smaller cards in radial mode", () => {
    const result = computeLayout("radial", tree);
    expect(result.cardSize).toEqual(CARD_SIZES.radial);
    expect(result.centre).not.toBeNull();
    expect(result.positions.get("r")).toEqual(result.centre);
  });

  it("uses the bigger detailed sizes when detail is on", () => {
    expect(computeLayout("vertical", tree, true).cardSize).toEqual(DETAILED_CARD_SIZES.vertical);
    expect(cardSizeFor("radial", true)).toEqual(DETAILED_CARD_SIZES.radial);
    expect(cardSizeFor("radial", false)).toEqual(CARD_SIZES.radial);
  });

  it("spreads the radial rings out for detailed cards", () => {
    const plain = computeLayout("radial", tree, false);
    const detailed = computeLayout("radial", tree, true);
    const distance = (layout: typeof plain): number => {
      const a = layout.positions.get("a")!;
      return Math.hypot(a.x - layout.centre!.x, a.y - layout.centre!.y);
    };
    expect(distance(detailed)).toBeCloseTo(distance(plain) * 1.3);
  });

  it("makes radial cards smaller than vertical ones", () => {
    expect(CARD_SIZES.radial.width).toBeLessThan(CARD_SIZES.vertical.width);
    expect(CARD_SIZES.radial.height).toBeLessThan(CARD_SIZES.vertical.height);
  });
});
