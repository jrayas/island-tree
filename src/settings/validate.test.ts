import { describe, expect, it } from "vitest";
import {
  cleanPresetName,
  coerceField,
  loadSettingsFrom,
  migrateSettings,
  sanitiseSettings,
} from "./validate";
import { DEFAULT_SETTINGS, SETTINGS_VERSION, findField, type Field } from "./schema";

const field = (id: string): Field => {
  const found = findField(id);
  if (!found) throw new Error(id);
  return found;
};

describe("coerceField: numbers", () => {
  const width = field("cards.width"); // 80 to 260, step 2

  it("accepts a value in range", () => {
    expect(coerceField(width, 120)).toEqual({ status: "ok", value: 120 });
  });

  it("limits values outside the range and says so", () => {
    expect(coerceField(width, 900)).toEqual({ status: "clamped", value: 260 });
    expect(coerceField(width, -5)).toEqual({ status: "clamped", value: 80 });
  });

  it("snaps to the step without calling it a problem", () => {
    expect(coerceField(width, 117)).toEqual({ status: "ok", value: 118 });
    expect(coerceField(field("lines.thickness"), 1.3)).toEqual({ status: "ok", value: 1.5 });
  });

  it("rejects non-numbers and non-finite numbers", () => {
    expect(coerceField(width, "120").status).toBe("rejected");
    expect(coerceField(width, Number.NaN).status).toBe("rejected");
    expect(coerceField(width, Number.POSITIVE_INFINITY).status).toBe("rejected");
    expect(coerceField(width, null).status).toBe("rejected");
  });

  it("removes floating point noise", () => {
    expect(coerceField(field("canvas.gridSize"), 0.30000000000000004 + 0.9)).toEqual({ status: "ok", value: 1.2 });
  });
});

describe("coerceField: options, booleans, colours and text", () => {
  it("accepts only listed options", () => {
    expect(coerceField(field("lines.curve"), "step")).toEqual({ status: "ok", value: "step" });
    expect(coerceField(field("lines.curve"), "wiggly").status).toBe("rejected");
    expect(coerceField(field("lines.curve"), 3).status).toBe("rejected");
  });

  it("accepts only real booleans", () => {
    expect(coerceField(field("cards.showAge"), false)).toEqual({ status: "ok", value: false });
    expect(coerceField(field("cards.showAge"), "true").status).toBe("rejected");
    expect(coerceField(field("cards.showAge"), 1).status).toBe("rejected");
  });

  it("accepts hex colours and the empty string, in lower case", () => {
    const colour = field("lines.highlightColour");
    expect(coerceField(colour, "")).toEqual({ status: "ok", value: "" });
    expect(coerceField(colour, "#FF8800")).toEqual({ status: "ok", value: "#ff8800" });
    expect(coerceField(colour, "#f80")).toEqual({ status: "ok", value: "#f80" });
  });

  it("rejects anything that is not a hex colour, including CSS that could do harm", () => {
    const colour = field("lines.highlightColour");
    for (const bad of ["red", "rgb(1,2,3)", "#12", "#gggggg", "url(http://x)", "#fff; color: red", 5, null]) {
      expect(coerceField(colour, bad).status).toBe("rejected");
    }
  });

  it("cleans text, limits its length and rejects blanks", () => {
    const status = field("cards.statusProperty");
    expect(coerceField(status, "  state ")).toEqual({ status: "ok", value: "state" });
    expect(coerceField(status, "a\nb")).toEqual({ status: "ok", value: "a b" });
    expect(coerceField(status, "x".repeat(80))).toEqual({ status: "clamped", value: "x".repeat(50) });
    expect(coerceField(status, "   ").status).toBe("rejected");
    expect(coerceField(status, 7).status).toBe("rejected");
  });
});

describe("sanitiseSettings", () => {
  it("returns the defaults for empty, null and nonsense input", () => {
    for (const input of [undefined, null, {}, "text", 5, [], [1, 2]]) {
      expect(sanitiseSettings(input).settings).toEqual(DEFAULT_SETTINGS);
    }
  });

  it("reports every field as defaulted when given nothing", () => {
    const { report } = sanitiseSettings({});
    expect(report.applied).toBe(0);
    expect(report.defaulted).toBeGreaterThan(30);
    expect(report.clamped).toEqual([]);
    expect(report.rejected).toEqual([]);
  });

  it("keeps valid values and reports them as applied", () => {
    const { settings, report } = sanitiseSettings({ cards: { width: 130 }, lines: { curve: "straight" } });
    expect(settings.cards.width).toBe(130);
    expect(settings.lines.curve).toBe("straight");
    expect(report.applied).toBe(2);
  });

  it("limits out-of-range numbers and rejects wrong types, with readable messages", () => {
    const { settings, report } = sanitiseSettings({
      cards: { width: 5000, height: "tall" },
      layout: { defaultLayout: "diagonal" },
    });
    expect(settings.cards.width).toBe(260);
    expect(settings.cards.height).toBe(DEFAULT_SETTINGS.cards.height);
    expect(settings.layout.defaultLayout).toBe("vertical");
    expect(report.clamped).toEqual(["Cards: Card width: 5000 was adjusted to 260"]);
    expect(report.rejected).toHaveLength(2);
    expect(report.rejected[0]).toContain("Card height");
  });

  it("ignores and reports keys it does not know", () => {
    const { settings, report } = sanitiseSettings({ cards: { colour: "red" }, extra: 1, version: 2 });
    expect(report.ignored).toEqual(["Unknown setting cards.colour", "Unknown section extra"]);
    expect(JSON.stringify(settings)).not.toContain("colour\":\"red");
  });

  it("is not fooled by prototype pollution keys", () => {
    const hostile: unknown = JSON.parse('{"__proto__":{"polluted":true},"cards":{"__proto__":{"polluted":true},"width":120}}');
    const { settings } = sanitiseSettings(hostile);
    expect(settings.cards.width).toBe(120);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((settings.cards as unknown as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("always stamps the current version", () => {
    expect(sanitiseSettings({ version: 99 }).settings.version).toBe(SETTINGS_VERSION);
  });

  it("does not change its input", () => {
    const input = { cards: { width: 5000 } };
    sanitiseSettings(input);
    expect(input).toEqual({ cards: { width: 5000 } });
  });
});

describe("sanitiseSettings: presets", () => {
  const preset = (name: unknown, values: unknown) => ({ name, values });

  it("keeps a valid preset and limits its values", () => {
    const { settings } = sanitiseSettings({
      presets: [preset("Mine", { "cards.width": 999, "layout.gap": 20 })],
    });
    expect(settings.presets).toEqual([{ name: "Mine", values: { "cards.width": 260, "layout.gap": 20 } }]);
  });

  it("drops unusable values, unknown ids and settings that are not part of a look", () => {
    const { settings, report } = sanitiseSettings({
      presets: [preset("Mine", { "cards.width": "wide", "nope.x": 1, "cards.statusProperty": "x", "editing.allowDrag": false })],
    });
    expect(settings.presets).toEqual([{ name: "Mine", values: {} }]);
    expect(report.ignored.length).toBe(3);
    expect(report.rejected.length).toBe(1);
  });

  it("rejects bad entries and names that clash with built-ins or each other", () => {
    const { settings, report } = sanitiseSettings({
      presets: [
        "nonsense",
        preset(5, {}),
        preset("compact", {}),
        preset("  ", {}),
        preset("Mine", {}),
        preset("MINE", {}),
      ],
    });
    expect(settings.presets.map((p) => p.name)).toEqual(["Mine"]);
    expect(report.rejected.length + report.ignored.length).toBe(5);
  });

  it("limits how many presets are kept", () => {
    const many = Array.from({ length: 40 }, (_, i) => preset(`P${i}`, {}));
    expect(sanitiseSettings({ presets: many }).settings.presets).toHaveLength(30);
  });

  it("rejects a presets value that is not a list", () => {
    const { settings, report } = sanitiseSettings({ presets: { a: 1 } });
    expect(settings.presets).toEqual([]);
    expect(report.rejected).toHaveLength(1);
  });
});

describe("cleanPresetName", () => {
  it("collapses spaces, strips control characters and limits the length", () => {
    expect(cleanPresetName("  My   look\n")).toBe("My look");
    expect(cleanPresetName("x".repeat(100))).toHaveLength(40);
  });
});

describe("migrateSettings and loadSettingsFrom", () => {
  it("moves version 1 fields into their groups", () => {
    const migrated = migrateSettings({ version: 1, defaultLayout: "radial", statusProperty: "state" });
    expect(migrated).toEqual({
      version: SETTINGS_VERSION,
      layout: { defaultLayout: "radial" },
      cards: { statusProperty: "state" },
    });
  });

  it("treats data with no version as version 1", () => {
    const loaded = loadSettingsFrom({ defaultLayout: "radial" });
    expect(loaded.layout.defaultLayout).toBe("radial");
  });

  it("loads version 1 data as valid current settings", () => {
    const loaded = loadSettingsFrom({ version: 1, defaultLayout: "radial", statusProperty: "state" });
    expect(loaded.layout.defaultLayout).toBe("radial");
    expect(loaded.cards.statusProperty).toBe("state");
    expect(loaded.cards.width).toBe(DEFAULT_SETTINGS.cards.width);
  });

  it("returns an empty object for data that is not an object, and leaves current data alone", () => {
    expect(migrateSettings(null)).toEqual({});
    const current = { version: SETTINGS_VERSION, cards: { width: 120 } };
    expect(migrateSettings(current)).toBe(current);
  });

  it("falls back to the defaults for a missing save file", () => {
    expect(loadSettingsFrom(null)).toEqual(DEFAULT_SETTINGS);
  });
});
