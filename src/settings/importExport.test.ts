import { describe, expect, it } from "vitest";
import { EXPORT_FORMAT, MAX_IMPORT_CHARACTERS, exportSettings, parseImport } from "./importExport";
import { saveCurrentAsPreset } from "./presets";
import { DEFAULT_SETTINGS, SETTINGS_VERSION, findField, withFieldValue } from "./schema";

const wide = withFieldValue(DEFAULT_SETTINGS, findField("cards.width")!, 150);

describe("exportSettings", () => {
  it("labels the file and includes the settings", () => {
    const parsed = JSON.parse(exportSettings(wide)) as { format: string; settings: { cards: { width: number } } };
    expect(parsed.format).toBe(EXPORT_FORMAT);
    expect(parsed.settings.cards.width).toBe(150);
  });
});

describe("parseImport", () => {
  it("round-trips exported settings", () => {
    const result = parseImport(exportSettings(wide), DEFAULT_SETTINGS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings).toEqual(wide);
    expect(result.report.rejected).toEqual([]);
  });

  it("rejects text that is not JSON", () => {
    const result = parseImport("{ nope", DEFAULT_SETTINGS);
    expect(result).toEqual({ ok: false, error: "That is not valid JSON, so it cannot be a settings file." });
  });

  it("rejects JSON that is not one of our files", () => {
    for (const text of ["[]", "5", "null", '{"settings":{}}', '{"format":"other","settings":{}}', '{"format":"island-tree-settings"}']) {
      const result = parseImport(text, DEFAULT_SETTINGS);
      expect(result).toEqual({ ok: false, error: "That is not an Island tree settings file." });
    }
  });

  it("rejects a file that is far too large", () => {
    const result = parseImport(" ".repeat(MAX_IMPORT_CHARACTERS + 1), DEFAULT_SETTINGS);
    expect(result.ok).toBe(false);
  });

  it("rejects a file from a newer version", () => {
    const text = JSON.stringify({ format: EXPORT_FORMAT, settings: { version: SETTINGS_VERSION + 1 } });
    const result = parseImport(text, DEFAULT_SETTINGS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("newer version");
  });

  it("limits bad numbers, ignores unknown keys and reports both", () => {
    const text = JSON.stringify({
      format: EXPORT_FORMAT,
      settings: { cards: { width: 9999, secret: "x" }, lines: { curve: "loop" } },
    });
    const result = parseImport(text, DEFAULT_SETTINGS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings.cards.width).toBe(260);
    expect(result.settings.lines.curve).toBe("curved");
    expect(result.report.clamped).toHaveLength(1);
    expect(result.report.rejected).toHaveLength(1);
    expect(result.report.ignored).toEqual(["Unknown setting cards.secret"]);
  });

  it("accepts an older exported version and migrates it", () => {
    const text = JSON.stringify({
      format: EXPORT_FORMAT,
      settings: { version: 1, defaultLayout: "radial", statusProperty: "state" },
    });
    const result = parseImport(text, DEFAULT_SETTINGS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings.layout.defaultLayout).toBe("radial");
    expect(result.settings.cards.statusProperty).toBe("state");
  });

  it("adds imported presets and keeps the current ones", () => {
    const mine = saveCurrentAsPreset(DEFAULT_SETTINGS, "Mine");
    const theirs = saveCurrentAsPreset(wide, "Theirs");
    if (!mine.ok || !theirs.ok) throw new Error("not saved");
    const result = parseImport(exportSettings(theirs.settings), mine.settings);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings.presets.map((p) => p.name)).toEqual(["Mine", "Theirs"]);
    expect(result.presetsAdded).toEqual(["Theirs"]);
  });

  it("skips an imported preset whose name is already used and keeps the existing one", () => {
    const mine = saveCurrentAsPreset(DEFAULT_SETTINGS, "Same");
    const theirs = saveCurrentAsPreset(wide, "same");
    if (!mine.ok || !theirs.ok) throw new Error("not saved");
    const result = parseImport(exportSettings(theirs.settings), mine.settings);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.presetsSkipped).toEqual(["same"]);
    expect(result.settings.presets).toHaveLength(1);
    expect(result.settings.presets[0]?.values["cards.width"]).toBe(DEFAULT_SETTINGS.cards.width);
  });

  it("does not change the current settings object", () => {
    const before = JSON.stringify(DEFAULT_SETTINGS);
    parseImport(exportSettings(wide), DEFAULT_SETTINGS);
    expect(JSON.stringify(DEFAULT_SETTINGS)).toBe(before);
  });
});
