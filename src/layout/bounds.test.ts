import { describe, expect, it } from "vitest";
import { boundsOfCards } from "./bounds";

describe("boundsOfCards", () => {
  it("returns null when there are no cards", () => {
    expect(boundsOfCards([], 100, 40)).toBeNull();
  });

  it("wraps a single card", () => {
    expect(boundsOfCards([{ x: 50, y: 20 }], 100, 40)).toEqual({ x: 0, y: 0, width: 100, height: 40 });
  });

  it("covers the outer edges of every card", () => {
    const box = boundsOfCards(
      [
        { x: 50, y: 20 },
        { x: 250, y: 120 },
      ],
      100,
      40,
    );
    expect(box).toEqual({ x: 0, y: 0, width: 300, height: 140 });
  });

  it("handles negative coordinates", () => {
    const box = boundsOfCards([{ x: -100, y: -50 }, { x: 100, y: 50 }], 20, 10);
    expect(box).toEqual({ x: -110, y: -55, width: 220, height: 110 });
  });
});
