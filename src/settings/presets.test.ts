import { describe, expect, it } from "vitest";
import {
  BUILT_IN_PRESETS,
  applyPreset,
  checkPresetName,
  deletePreset,
  lookOf,
  renamePreset,
  resetEverything,
  resetTab,
  saveCurrentAsPreset,
} from "./presets";
import { DEFAULT_SETTINGS, FIELDS, findField, withFieldValue, type IslandTreeSettings } from "./schema";
import { coerceField } from "./validate";

const withWidth = (width: number): IslandTreeSettings =>
  withFieldValue(DEFAULT_SETTINGS, findField("cards.width")!, width);

describe("built-in presets", () => {
  it("only name settings that exist, are part of a look and are within range", () => {
    for (const preset of BUILT_IN_PRESETS) {
      for (const [id, value] of Object.entries(preset.values)) {
        const field = findField(id);
        expect(field, `${preset.name}: ${id}`).toBeDefined();
        expect(field?.inPreset).toBe(true);
        expect(coerceField(field!, value).status).toBe("ok");
      }
    }
  });

  it("makes Compact smaller and Large bigger than the default", () => {
    const compact = applyPreset(DEFAULT_SETTINGS, BUILT_IN_PRESETS[0]);
    const large = applyPreset(DEFAULT_SETTINGS, BUILT_IN_PRESETS[2]);
    expect(compact.cards.width).toBeLessThan(DEFAULT_SETTINGS.cards.width);
    expect(large.cards.width).toBeGreaterThan(DEFAULT_SETTINGS.cards.width);
  });

  it("makes Comfortable the default look", () => {
    const messy = withWidth(200);
    const comfortable = BUILT_IN_PRESETS.find((p) => p.name === "Comfortable")!;
    expect(applyPreset(messy, comfortable)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("applyPreset", () => {
  it("returns every look setting to its default before applying the preset", () => {
    const messy = withFieldValue(withWidth(200), findField("lines.curve")!, "step");
    const result = applyPreset(messy, { values: { "cards.height": 60 } });
    expect(result.cards.height).toBe(60);
    expect(result.cards.width).toBe(DEFAULT_SETTINGS.cards.width);
    expect(result.lines.curve).toBe("curved");
  });

  it("leaves the status property, editing settings and saved presets alone", () => {
    let settings = withFieldValue(DEFAULT_SETTINGS, findField("cards.statusProperty")!, "state");
    settings = withFieldValue(settings, findField("editing.allowDrag")!, false);
    settings = { ...settings, presets: [{ name: "Mine", values: {} }] };
    const result = applyPreset(settings, { values: {} });
    expect(result.cards.statusProperty).toBe("state");
    expect(result.editing.allowDrag).toBe(false);
    expect(result.presets).toEqual(settings.presets);
  });

  it("does not change the settings it was given", () => {
    const settings = withWidth(200);
    applyPreset(settings, { values: { "cards.width": 100 } });
    expect(settings.cards.width).toBe(200);
  });
});

describe("lookOf", () => {
  it("covers exactly the settings that are part of a look", () => {
    const ids = Object.keys(lookOf(DEFAULT_SETTINGS)).sort();
    const expected = FIELDS.filter((f) => f.inPreset).map((f) => `${f.group}.${f.key}`).sort();
    expect(ids).toEqual(expected);
    expect(ids).not.toContain("cards.statusProperty");
    expect(ids.some((id) => id.startsWith("editing."))).toBe(false);
  });
});

describe("checkPresetName", () => {
  it("accepts and tidies a good name", () => {
    expect(checkPresetName("  My   look ", [])).toEqual({ ok: true, name: "My look" });
  });

  it("rejects blank, too long, built-in and duplicate names", () => {
    expect(checkPresetName("   ", []).ok).toBe(false);
    expect(checkPresetName("x".repeat(60), []).ok).toBe(false);
    expect(checkPresetName("compact", []).ok).toBe(false);
    expect(checkPresetName("Mine", ["mine"]).ok).toBe(false);
  });

  it("allows keeping the same name (apart from case) when renaming", () => {
    expect(checkPresetName("MINE", ["Mine"], "Mine")).toEqual({ ok: true, name: "MINE" });
  });
});

describe("saving, renaming and deleting presets", () => {
  it("saves the current look under a new name", () => {
    const result = saveCurrentAsPreset(withWidth(150), "Wide");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings.presets).toHaveLength(1);
    expect(result.settings.presets[0]?.values["cards.width"]).toBe(150);
  });

  it("can be applied again later", () => {
    const saved = saveCurrentAsPreset(withWidth(150), "Wide");
    if (!saved.ok) throw new Error("not saved");
    const back = applyPreset(DEFAULT_SETTINGS, saved.settings.presets[0]);
    expect(back.cards.width).toBe(150);
  });

  it("refuses a bad or duplicate name and says why", () => {
    const first = saveCurrentAsPreset(DEFAULT_SETTINGS, "Mine");
    if (!first.ok) throw new Error("not saved");
    const again = saveCurrentAsPreset(first.settings, "mine");
    expect(again).toEqual({ ok: false, reason: "A preset with that name already exists." });
  });

  it("stops at 30 saved presets", () => {
    let settings = DEFAULT_SETTINGS;
    for (let i = 0; i < 30; i++) {
      const result = saveCurrentAsPreset(settings, `P${i}`);
      if (!result.ok) throw new Error(result.reason);
      settings = result.settings;
    }
    expect(saveCurrentAsPreset(settings, "One more").ok).toBe(false);
  });

  it("renames a preset and keeps its values", () => {
    const saved = saveCurrentAsPreset(withWidth(150), "Wide");
    if (!saved.ok) throw new Error("not saved");
    const renamed = renamePreset(saved.settings, "Wide", "Extra wide");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.settings.presets[0]?.name).toBe("Extra wide");
    expect(renamed.settings.presets[0]?.values["cards.width"]).toBe(150);
  });

  it("will not rename a preset that is gone or to a name already used", () => {
    const a = saveCurrentAsPreset(DEFAULT_SETTINGS, "A");
    if (!a.ok) throw new Error("not saved");
    const b = saveCurrentAsPreset(a.settings, "B");
    if (!b.ok) throw new Error("not saved");
    expect(renamePreset(b.settings, "A", "B").ok).toBe(false);
    expect(renamePreset(b.settings, "Missing", "C").ok).toBe(false);
  });

  it("deletes a preset by name", () => {
    const saved = saveCurrentAsPreset(DEFAULT_SETTINGS, "A");
    if (!saved.ok) throw new Error("not saved");
    expect(deletePreset(saved.settings, "A").presets).toEqual([]);
  });
});

describe("resetTab and resetEverything", () => {
  it("resets only the settings on one tab", () => {
    let settings = withWidth(200);
    settings = withFieldValue(settings, findField("layout.gap")!, 30);
    const result = resetTab(settings, "cards");
    expect(result.cards.width).toBe(DEFAULT_SETTINGS.cards.width);
    expect(result.layout.gap).toBe(30);
  });

  it("resets the lines and grid tab, which covers two groups", () => {
    let settings = withFieldValue(DEFAULT_SETTINGS, findField("lines.curve")!, "step");
    settings = withFieldValue(settings, findField("canvas.grid")!, "none");
    const result = resetTab(settings, "lines");
    expect(result.lines.curve).toBe("curved");
    expect(result.canvas.grid).toBe("dots");
  });

  it("resets everything but keeps saved presets", () => {
    const saved = saveCurrentAsPreset(withWidth(200), "Keep me");
    if (!saved.ok) throw new Error("not saved");
    const result = resetEverything(saved.settings);
    expect(result.cards.width).toBe(DEFAULT_SETTINGS.cards.width);
    expect(result.presets).toHaveLength(1);
  });
});
