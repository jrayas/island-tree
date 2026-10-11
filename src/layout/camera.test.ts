import { describe, expect, it } from "vitest";
import { cameraFromView, parseCamera, parseCameras, viewFromCamera, withCamera } from "./camera";

const pane = { width: 1000, height: 600 };

describe("cameraFromView and viewFromCamera", () => {
  it("round trips in the same pane", () => {
    const view = { x: -240, y: 130, zoom: 1.5 };
    const back = viewFromCamera(cameraFromView(view, pane), pane);
    expect(back.zoom).toBeCloseTo(view.zoom, 3);
    expect(back.x).toBeCloseTo(view.x, 0);
    expect(back.y).toBeCloseTo(view.y, 0);
  });

  it("stores the card-space point in the middle of the pane", () => {
    // The origin sits at the pane's centre at 100%, so the camera looks at (0, 0).
    expect(cameraFromView({ x: 500, y: 300, zoom: 1 }, pane)).toEqual({ x: 0, y: 0, zoom: 1 });
    // Moved left by 200px at 100%: the middle now shows card-space x = 200.
    expect(cameraFromView({ x: 300, y: 300, zoom: 1 }, pane).x).toBe(200);
  });

  it("stays centred on the same spot in a pane of another size", () => {
    const camera = cameraFromView({ x: 300, y: 100, zoom: 2 }, pane);
    const bigger = { width: 1600, height: 900 };
    const view = viewFromCamera(camera, bigger);
    // The same card-space point lands in the middle of the bigger pane.
    expect((bigger.width / 2 - view.x) / view.zoom).toBeCloseTo(camera.x, 2);
    expect((bigger.height / 2 - view.y) / view.zoom).toBeCloseTo(camera.y, 2);
    expect(view.zoom).toBe(2);
  });
});

describe("parseCamera", () => {
  it("accepts a usable camera", () => {
    expect(parseCamera({ x: 10, y: -20, zoom: 1.2 })).toEqual({ x: 10, y: -20, zoom: 1.2 });
  });

  it("keeps the zoom in range", () => {
    expect(parseCamera({ x: 0, y: 0, zoom: 50 })?.zoom).toBe(2);
    expect(parseCamera({ x: 0, y: 0, zoom: 0 })?.zoom).toBe(0.2);
  });

  it("rejects anything else", () => {
    expect(parseCamera(null)).toBeNull();
    expect(parseCamera("view")).toBeNull();
    expect(parseCamera({ x: "1", y: 0, zoom: 1 })).toBeNull();
    expect(parseCamera({ x: 0, y: 0 })).toBeNull();
    expect(parseCamera({ x: Infinity, y: 0, zoom: 1 })).toBeNull();
    expect(parseCamera({ x: NaN, y: 0, zoom: 1 })).toBeNull();
    expect(parseCamera({ x: 1e9, y: 0, zoom: 1 })).toBeNull();
  });
});

describe("parseCameras", () => {
  it("reads only the known layouts and drops the bad ones", () => {
    const cameras = parseCameras({
      vertical: { x: 1, y: 2, zoom: 1 },
      radial: { x: "no", y: 0, zoom: 1 },
      spiral: { x: 0, y: 0, zoom: 1 },
      mindmap: { x: 5, y: 6, zoom: 0.5 },
    });
    expect(cameras).toEqual({ vertical: { x: 1, y: 2, zoom: 1 }, mindmap: { x: 5, y: 6, zoom: 0.5 } });
  });

  it("returns nothing for missing or odd input", () => {
    expect(parseCameras(undefined)).toEqual({});
    expect(parseCameras([])).toEqual({});
    expect(parseCameras("x")).toEqual({});
  });
});

describe("withCamera", () => {
  const camera = { x: 1, y: 2, zoom: 1 };
  it("sets one layout's camera and leaves the others", () => {
    expect(withCamera({ radial: { x: 0, y: 0, zoom: 1 } }, "vertical", camera)).toEqual({
      radial: { x: 0, y: 0, zoom: 1 },
      vertical: camera,
    });
  });
  it("forgets one layout's camera, without changing the original", () => {
    const before = { vertical: camera, radial: camera };
    const after = withCamera(before, "vertical", null);
    expect(after).toEqual({ radial: camera });
    expect(before.vertical).toBe(camera);
  });
});
