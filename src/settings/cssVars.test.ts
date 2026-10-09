import { describe, expect, it } from "vitest";
import { settingsToCssVars } from "./cssVars";
import { DEFAULT_SETTINGS, findField, withFieldValue, type IslandTreeSettings } from "./schema";

const set = (settings: IslandTreeSettings, id: string, value: string | number | boolean): IslandTreeSettings =>
  withFieldValue(settings, findField(id)!, value);

describe("settingsToCssVars", () => {
  it("gives the default look with theme variables where nothing is chosen", () => {
    const vars = settingsToCssVars(DEFAULT_SETTINGS);
    expect(vars["--island-card-radius"]).toBe("20px");
    expect(vars["--island-card-border"]).toBe("1px");
    expect(vars["--island-card-padding-x"]).toBe("12px");
    expect(vars["--island-font-size"]).toBe("var(--font-ui-small)");
    expect(vars["--island-font-size-compact"]).toBe("var(--font-ui-smaller)");
    expect(vars["--island-line-width"]).toBe("1.5px");
    expect(vars["--island-line-dash"]).toBe("4 6");
    expect(vars["--island-highlight-colour"]).toBe("var(--interactive-accent)");
    expect(vars["--island-grid-colour"]).toBe(
      "color-mix(in srgb, var(--background-modifier-border) 100%, transparent)",
    );
  });

  it("uses an explicit text size and a slightly smaller compact size", () => {
    const vars = settingsToCssVars(set(DEFAULT_SETTINGS, "cards.fontSize", 15));
    expect(vars["--island-font-size"]).toBe("15px");
    expect(vars["--island-font-size-compact"]).toBe("14px");
  });

  it("never lets the compact size fall below 9px", () => {
    const vars = settingsToCssVars(set(DEFAULT_SETTINGS, "cards.fontSize", 6));
    expect(vars["--island-font-size-compact"]).toBe("9px");
  });

  it("writes dash patterns and a round cap for dots", () => {
    expect(settingsToCssVars(set(DEFAULT_SETTINGS, "lines.dash", "solid"))["--island-line-dash"]).toBe("none");
    const dotted = settingsToCssVars(set(DEFAULT_SETTINGS, "lines.dash", "dotted"));
    expect(dotted["--island-line-dash"]).toBe("1.5 6");
    expect(dotted["--island-line-cap"]).toBe("round");
    expect(settingsToCssVars(DEFAULT_SETTINGS)["--island-line-cap"]).toBe("butt");
  });

  it("scales the flow animation with the speed and turns it off at 0", () => {
    const normal = settingsToCssVars(DEFAULT_SETTINGS);
    expect(normal["--island-line-animation"]).toBe("island-flow 1.8s linear infinite");
    expect(normal["--island-line-animation-highlight"]).toBe("island-flow 0.7s linear infinite");
    const fast = settingsToCssVars(set(DEFAULT_SETTINGS, "lines.flowSpeed", 2));
    expect(fast["--island-line-animation"]).toBe("island-flow 0.9s linear infinite");
    const off = settingsToCssVars(set(DEFAULT_SETTINGS, "lines.flowSpeed", 0));
    expect(off["--island-line-animation"]).toBe("none");
    expect(off["--island-line-animation-highlight"]).toBe("none");
  });

  it("uses a chosen highlight colour", () => {
    const vars = settingsToCssVars(set(DEFAULT_SETTINGS, "lines.highlightColour", "#ff8800"));
    expect(vars["--island-highlight-colour"]).toBe("#ff8800");
  });

  it("mixes the grid colour with its opacity", () => {
    let settings = set(DEFAULT_SETTINGS, "canvas.gridColour", "#112233");
    settings = set(settings, "canvas.gridOpacity", 40);
    expect(settingsToCssVars(settings)["--island-grid-colour"]).toBe(
      "color-mix(in srgb, #112233 40%, transparent)",
    );
  });
});
