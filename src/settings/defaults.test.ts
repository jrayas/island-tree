import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SETTINGS_VERSION, clampNumber } from "./defaults";

describe("DEFAULT_SETTINGS", () => {
  it("has the current version and no saved presets", () => {
    expect(DEFAULT_SETTINGS.version).toBe(SETTINGS_VERSION);
    expect(DEFAULT_SETTINGS.presets).toEqual([]);
  });

  it("matches the look the dashboard had before settings existed", () => {
    expect(DEFAULT_SETTINGS.cards).toMatchObject({ width: 116, height: 40, radius: 20, fontSize: 0 });
    expect(DEFAULT_SETTINGS.layout).toMatchObject({
      defaultLayout: "vertical",
      gap: 14,
      levelGap: 44,
      ringRadius: 125,
      ringStep: 90,
      overflowLimit: 40,
    });
    expect(DEFAULT_SETTINGS.lines).toMatchObject({ curve: "curved", dash: "dashed", flowSpeed: 1 });
    expect(DEFAULT_SETTINGS.canvas).toMatchObject({ grid: "dots", gridSpacing: 22 });
  });

  it("looks for a status property called status and starts locked", () => {
    expect(DEFAULT_SETTINGS.cards.statusProperty).toBe("status");
    expect(DEFAULT_SETTINGS.editing.startLocked).toBe(true);
  });
});

describe("clampNumber", () => {
  it("returns values already in range unchanged", () => {
    expect(clampNumber(5, 0, 10, 3)).toBe(5);
  });

  it("clamps values below the minimum and above the maximum", () => {
    expect(clampNumber(-4, 0, 10, 3)).toBe(0);
    expect(clampNumber(99, 0, 10, 3)).toBe(10);
  });

  it("accepts the range limits themselves", () => {
    expect(clampNumber(0, 0, 10, 3)).toBe(0);
    expect(clampNumber(10, 0, 10, 3)).toBe(10);
  });

  it("falls back for non-numbers and non-finite numbers", () => {
    expect(clampNumber("7", 0, 10, 3)).toBe(3);
    expect(clampNumber(undefined, 0, 10, 3)).toBe(3);
    expect(clampNumber(null, 0, 10, 3)).toBe(3);
    expect(clampNumber(Number.NaN, 0, 10, 3)).toBe(3);
    expect(clampNumber(Number.POSITIVE_INFINITY, 0, 10, 3)).toBe(3);
  });
});
