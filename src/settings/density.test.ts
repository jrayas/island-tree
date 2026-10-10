import { describe, expect, it } from "vitest";
import { withDensity } from "./density";
import { BUILT_IN_PRESETS } from "./presets";
import { DEFAULT_SETTINGS, findField, withFieldValue, type IslandTreeSettings } from "./schema";

const set = (settings: IslandTreeSettings, id: string, value: string | number): IslandTreeSettings =>
  withFieldValue(settings, findField(id)!, value);

const compact = (settings: IslandTreeSettings = DEFAULT_SETTINGS): IslandTreeSettings =>
  set(settings, "layout.density", "compact");

describe("withDensity", () => {
  it("returns the very same settings when comfortable", () => {
    expect(withDensity(DEFAULT_SETTINGS)).toBe(DEFAULT_SETTINGS);
  });

  it("draws the Compact preset's sizes when compact", () => {
    const drawn = withDensity(compact());
    const preset = BUILT_IN_PRESETS.find((p) => p.name === "Compact")!.values;
    expect(drawn.cards.width).toBe(preset["cards.width"]);
    expect(drawn.cards.height).toBe(preset["cards.height"]);
    expect(drawn.cards.fontSize).toBe(preset["cards.fontSize"]);
    expect(drawn.layout.gap).toBe(preset["layout.gap"]);
    expect(drawn.layout.levelGap).toBe(preset["layout.levelGap"]);
    expect(drawn.layout.ringRadius).toBe(preset["layout.ringRadius"]);
    expect(drawn.layout.ringStep).toBe(preset["layout.ringStep"]);
  });

  it("never changes the saved settings, so switching back is exact", () => {
    const own = set(set(DEFAULT_SETTINGS, "cards.width", 130), "layout.gap", 20);
    const before = JSON.stringify(own);
    const on = compact(own);
    withDensity(on);
    expect(JSON.stringify(own)).toBe(before);
    // Comfortable again gives the person's own sizes, not the defaults.
    const back = set(on, "layout.density", "comfortable");
    expect(withDensity(back).cards.width).toBe(130);
    expect(withDensity(back).layout.gap).toBe(20);
  });

  it("leaves everything that is not a size alone", () => {
    const own = set(set(DEFAULT_SETTINGS, "lines.thickness", 3), "canvas.gridColour", "#ff0000");
    const drawn = withDensity(compact(own));
    expect(drawn.lines).toEqual(own.lines);
    expect(drawn.canvas).toEqual(own.canvas);
    expect(drawn.editing).toEqual(own.editing);
    expect(drawn.cards.statusProperty).toBe(own.cards.statusProperty);
  });

  it("never makes a size larger than the person chose", () => {
    const small = set(set(set(DEFAULT_SETTINGS, "cards.width", 90), "cards.radius", 0), "layout.gap", 8);
    const drawn = withDensity(compact(small));
    expect(drawn.cards.width).toBe(90);
    expect(drawn.cards.radius).toBe(0);
    expect(drawn.layout.gap).toBe(8);
  });

  it("treats a text size of 0 (the theme's) as larger than Compact", () => {
    const own = set(DEFAULT_SETTINGS, "cards.fontSize", 0);
    expect(withDensity(compact(own)).cards.fontSize).toBe(12);
  });

  it("keeps a text size the person made smaller than Compact", () => {
    const own = set(DEFAULT_SETTINGS, "cards.fontSize", 10);
    expect(withDensity(compact(own)).cards.fontSize).toBe(10);
  });
});
