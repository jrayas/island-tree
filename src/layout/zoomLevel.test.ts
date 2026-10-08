import { describe, expect, it } from "vitest";
import { DETAILED_FROM, MINIMAL_BELOW, zoomLevel } from "./zoomLevel";

describe("zoomLevel", () => {
  it("is minimal when zoomed far out", () => {
    expect(zoomLevel(0.2)).toBe("minimal");
    expect(zoomLevel(MINIMAL_BELOW - 0.001)).toBe("minimal");
  });

  it("is normal in the middle, including at the minimal boundary", () => {
    expect(zoomLevel(MINIMAL_BELOW)).toBe("normal");
    expect(zoomLevel(0.6)).toBe("normal");
  });

  it("is detailed from the detailed boundary upwards", () => {
    expect(zoomLevel(DETAILED_FROM)).toBe("detailed");
    expect(zoomLevel(1)).toBe("detailed");
    expect(zoomLevel(2)).toBe("detailed");
  });

  it("falls back to normal for a bad number", () => {
    expect(zoomLevel(Number.NaN)).toBe("normal");
    expect(zoomLevel(Number.POSITIVE_INFINITY)).toBe("normal");
  });
});
