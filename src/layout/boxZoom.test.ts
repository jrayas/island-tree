import { describe, expect, it } from "vitest";
import {
  BOX_MAX_ZOOM,
  cameraForRect,
  isDeliberateBox,
  rectBetween,
  rectToCanvas,
} from "./boxZoom";

describe("rectBetween", () => {
  it("is the same whichever corner the drag started from", () => {
    const expected = { x: 10, y: 20, width: 30, height: 40 };
    expect(rectBetween({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual(expected);
    expect(rectBetween({ x: 40, y: 60 }, { x: 10, y: 20 })).toEqual(expected);
    expect(rectBetween({ x: 40, y: 20 }, { x: 10, y: 60 })).toEqual(expected);
  });
});

describe("isDeliberateBox", () => {
  it("rejects a click and a tiny drag", () => {
    expect(isDeliberateBox({ x: 0, y: 0, width: 0, height: 0 })).toBe(false);
    expect(isDeliberateBox({ x: 0, y: 0, width: 19, height: 200 })).toBe(false);
    expect(isDeliberateBox({ x: 0, y: 0, width: 200, height: 19 })).toBe(false);
  });

  it("accepts a drag of at least the minimum in both directions", () => {
    expect(isDeliberateBox({ x: 0, y: 0, width: 20, height: 20 })).toBe(true);
  });

  it("uses a custom minimum", () => {
    expect(isDeliberateBox({ x: 0, y: 0, width: 30, height: 30 }, 40)).toBe(false);
  });
});

describe("rectToCanvas", () => {
  it("undoes the pan and zoom", () => {
    const rect = { x: 150, y: 90, width: 200, height: 100 };
    expect(rectToCanvas(rect, { x: 50, y: -10, zoom: 2 })).toEqual({ x: 50, y: 50, width: 100, height: 50 });
  });
});

describe("cameraForRect", () => {
  const limits = { minZoom: 0.2, maxZoom: BOX_MAX_ZOOM };

  it("fits the limiting side with the padding and centres the area", () => {
    // 400x200 area in a 1000x500 pane with 10% padding: room 800x400, so zoom 2 on both.
    const camera = cameraForRect({ x: 100, y: 50, width: 400, height: 200 }, 1000, 500, { minZoom: 0.2, maxZoom: 5 }, 0.1);
    expect(camera.zoom).toBeCloseTo(2);
    // The area's centre (300, 150) lands in the middle of the pane.
    expect(300 * camera.zoom + camera.x).toBeCloseTo(500);
    expect(150 * camera.zoom + camera.y).toBeCloseTo(250);
  });

  it("is limited by the tighter side", () => {
    const camera = cameraForRect({ x: 0, y: 0, width: 100, height: 1000 }, 1000, 500, { minZoom: 0.1, maxZoom: 5 }, 0);
    expect(camera.zoom).toBeCloseTo(0.5);
  });

  it("caps the zoom for a very small area", () => {
    const camera = cameraForRect({ x: 0, y: 0, width: 10, height: 10 }, 1000, 500, limits);
    expect(camera.zoom).toBe(BOX_MAX_ZOOM);
  });

  it("never goes below the minimum zoom", () => {
    const camera = cameraForRect({ x: 0, y: 0, width: 100000, height: 100000 }, 1000, 500, limits);
    expect(camera.zoom).toBe(0.2);
  });
});
