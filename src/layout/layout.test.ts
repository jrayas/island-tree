import { describe, expect, it } from "vitest";
import { DETAILED_RING_SCALE, MIND_MAP_COLUMN_FACTOR, cardSizeFor, computeLayout, ringRadii, type LayoutOptions } from "./layout";
import type { LayoutNode } from "./types";

const options: LayoutOptions = {
  cardWidth: 116,
  cardHeight: 40,
  gap: 14,
  levelGap: 44,
  ringRadius: 125,
  ringStep: 90,
};

const tree: LayoutNode = {
  id: "r",
  children: [
    { id: "a", children: [] },
    { id: "b", children: [] },
  ],
};

describe("cardSizeFor", () => {
  it("gives the mockup's four sizes at the default width and height", () => {
    expect(cardSizeFor("vertical", false, 116, 40)).toEqual({ width: 116, height: 40 });
    expect(cardSizeFor("vertical", true, 116, 40)).toEqual({ width: 168, height: 58 });
    expect(cardSizeFor("radial", false, 116, 40)).toEqual({ width: 88, height: 30 });
    expect(cardSizeFor("radial", true, 116, 40)).toEqual({ width: 132, height: 48 });
  });

  it("scales every size with the configured width and height", () => {
    expect(cardSizeFor("vertical", false, 200, 60)).toEqual({ width: 200, height: 60 });
    expect(cardSizeFor("vertical", true, 200, 60)).toEqual({ width: 290, height: 87 });
    expect(cardSizeFor("radial", false, 200, 60).width).toBeLessThan(200);
  });
});

describe("ringRadii", () => {
  it("gives the mockup's rings at the default first radius", () => {
    expect(ringRadii(125)).toEqual([0, 125, 235, 335, 425]);
  });

  it("scales all rings from the first one", () => {
    expect(ringRadii(100)).toEqual([0, 100, 188, 268, 340]);
  });
});

describe("computeLayout, mind map", () => {
  it("uses the plain card size and reports the side of every card", () => {
    const placed = computeLayout("mindmap", tree, false, options);
    expect(placed.cardSize).toEqual({ width: 116, height: 40 });
    expect(placed.sides?.get("a")).toBe("right");
    expect(placed.sides?.get("b")).toBe("left");
  });

  it("follows the chosen view and spaces the columns from the level spacing", () => {
    const oneSided = computeLayout("mindmap", tree, false, { ...options, mindMapView: "oneSided" });
    const root = oneSided.positions.get("r")!;
    const child = oneSided.positions.get("a")!;
    expect(child.x - root.x).toBe(116 + 44 * MIND_MAP_COLUMN_FACTOR);
    expect(oneSided.sides?.get("b")).toBe("right");
  });

  it("makes the cards bigger when detailed, like the vertical layout", () => {
    expect(cardSizeFor("mindmap", true, 116, 40)).toEqual(cardSizeFor("vertical", true, 116, 40));
  });

  it("leaves the other layouts without sides", () => {
    expect(computeLayout("vertical", tree, false, options).sides).toBeUndefined();
    expect(computeLayout("radial", tree, false, options).sides).toBeUndefined();
  });
});

describe("computeLayout", () => {
  it("uses the vertical engine and its card size in vertical mode", () => {
    const result = computeLayout("vertical", tree, false, options);
    expect(result.cardSize).toEqual({ width: 116, height: 40 });
    expect(result.centre).toBeNull();
    expect(result.positions.get("a")?.y).toBe(result.positions.get("b")?.y);
  });

  it("uses the configured gap and level spacing", () => {
    const tight = computeLayout("vertical", tree, false, { ...options, gap: 4, levelGap: 20 });
    const loose = computeLayout("vertical", tree, false, { ...options, gap: 40, levelGap: 80 });
    expect(loose.width).toBeGreaterThan(tight.width);
    expect(loose.height).toBeGreaterThan(tight.height);
  });

  it("uses the radial engine and smaller cards in radial mode", () => {
    const result = computeLayout("radial", tree, false, options);
    expect(result.cardSize).toEqual({ width: 88, height: 30 });
    expect(result.centre).not.toBeNull();
    expect(result.positions.get("r")).toEqual(result.centre);
  });

  it("uses the configured first ring radius", () => {
    const distance = (ring: number): number => {
      const layout = computeLayout("radial", tree, false, { ...options, ringRadius: ring });
      const a = layout.positions.get("a")!;
      return Math.hypot(a.x - layout.centre!.x, a.y - layout.centre!.y);
    };
    expect(distance(125)).toBeCloseTo(125);
    expect(distance(200)).toBeCloseTo(200);
  });

  it("uses the bigger detailed sizes when detail is on", () => {
    expect(computeLayout("vertical", tree, true, options).cardSize).toEqual({ width: 168, height: 58 });
  });

  it("spreads the radial rings out for detailed cards", () => {
    const plain = computeLayout("radial", tree, false, options);
    const detailed = computeLayout("radial", tree, true, options);
    const distance = (layout: typeof plain): number => {
      const a = layout.positions.get("a")!;
      return Math.hypot(a.x - layout.centre!.x, a.y - layout.centre!.y);
    };
    expect(distance(detailed)).toBeCloseTo(distance(plain) * DETAILED_RING_SCALE);
  });
});
