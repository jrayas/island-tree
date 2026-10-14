import { describe, expect, it } from "vitest";
import {
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CLOSE_UP_STEPS,
  CLOSE_UP_ZOOM,
  ZOOM_STEP,
  closeUpView,
  viewCentre,
} from "./camera";

const pane = { width: 800, height: 600 };

describe("close-up zoom", () => {
  it("is full size zoomed out three steps of the zoom buttons", () => {
    expect(CLOSE_UP_STEPS).toBe(3);
    expect(CLOSE_UP_ZOOM).toBeCloseTo(1 / (ZOOM_STEP * ZOOM_STEP * ZOOM_STEP));
    expect(CLOSE_UP_ZOOM).toBeCloseTo(0.5787, 3);
  });

  it("sits inside the canvas's zoom limits", () => {
    expect(CLOSE_UP_ZOOM).toBeGreaterThan(CAMERA_MIN_ZOOM);
    expect(CLOSE_UP_ZOOM).toBeLessThan(CAMERA_MAX_ZOOM);
  });
});

describe("closeUpView", () => {
  it("puts the target in the middle of the pane", () => {
    const view = closeUpView({ x: 300, y: -40 }, pane);
    expect(view.zoom).toBe(CLOSE_UP_ZOOM);
    expect(300 * view.zoom + view.x).toBeCloseTo(400);
    expect(-40 * view.zoom + view.y).toBeCloseTo(300);
  });
});

describe("viewCentre", () => {
  it("is the card-space point in the middle of the pane", () => {
    const view = { x: 100, y: 50, zoom: 2 };
    const centre = viewCentre(view, pane);
    expect(centre.x * view.zoom + view.x).toBeCloseTo(400);
    expect(centre.y * view.zoom + view.y).toBeCloseTo(300);
  });

  it("round trips with the close-up", () => {
    const centre = viewCentre(closeUpView({ x: 12, y: 34 }, pane), pane);
    expect(centre.x).toBeCloseTo(12);
    expect(centre.y).toBeCloseTo(34);
  });
});
