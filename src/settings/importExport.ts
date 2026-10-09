/**
 * Settings as a JSON file, out and in.
 *
 * Export is straightforward. Import treats the file as untrusted: it must be
 * parseable, of a size a settings file could be, labelled as ours and not from a
 * newer version, and then every value goes through the same checks as saved data.
 * Nothing in the file is ever executed or used as given.
 */
import { SETTINGS_VERSION, type IslandTreeSettings, type SavedPreset } from "./schema";
import { migrateSettings, sanitiseSettings, type ValidationReport } from "./validate";

export const EXPORT_FORMAT = "island-tree-settings";
/** Far larger than any real settings file; refusing bigger ones avoids parsing junk. */
export const MAX_IMPORT_CHARACTERS = 1_000_000;

export function exportSettings(settings: IslandTreeSettings): string {
  return JSON.stringify({ format: EXPORT_FORMAT, settings }, null, 2);
}

export type ImportResult =
  | {
      ok: true;
      settings: IslandTreeSettings;
      report: ValidationReport;
      /** Names of imported presets that were added. */
      presetsAdded: string[];
      /** Names of imported presets left out because a preset with that name exists. */
      presetsSkipped: string[];
    }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const MAX_SAVED = 30;

/**
 * Reads exported text and works out the settings that importing it would give.
 * Imported presets are added to the current ones; an imported preset whose name
 * is already taken is skipped. Does not change anything itself, so the caller
 * can show a summary and ask first.
 */
export function parseImport(text: string, current: IslandTreeSettings): ImportResult {
  if (text.length > MAX_IMPORT_CHARACTERS) {
    return { ok: false, error: "That file is too large to be a settings file." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That is not valid JSON, so it cannot be a settings file." };
  }

  if (!isRecord(parsed) || parsed.format !== EXPORT_FORMAT || !isRecord(parsed.settings)) {
    return { ok: false, error: "That is not an Island tree settings file." };
  }

  const version = parsed.settings.version;
  if (typeof version === "number" && version > SETTINGS_VERSION) {
    return {
      ok: false,
      error: "That file was made by a newer version of Island tree. Update the plugin and try again.",
    };
  }

  const { settings: imported, report } = sanitiseSettings(migrateSettings(parsed.settings));

  const taken = new Set(current.presets.map((p) => p.name.toLowerCase()));
  const presets: SavedPreset[] = [...current.presets];
  const presetsAdded: string[] = [];
  const presetsSkipped: string[] = [];
  for (const preset of imported.presets) {
    if (taken.has(preset.name.toLowerCase()) || presets.length >= MAX_SAVED) {
      presetsSkipped.push(preset.name);
      continue;
    }
    taken.add(preset.name.toLowerCase());
    presets.push(preset);
    presetsAdded.push(preset.name);
  }

  return { ok: true, settings: { ...imported, presets }, report, presetsAdded, presetsSkipped };
}
