/**
 * Turns untrusted data into valid settings.
 *
 * Saved data can be old, hand-edited or imported from a stranger's file, so it is
 * never used as given. Each field is checked against the table in `schema.ts`:
 * numbers are limited to their range, options must exist, unknown keys are
 * ignored. A report says what happened, so an import can show it to the user.
 */
import {
  DEFAULT_SETTINGS,
  FIELDS,
  SETTINGS_VERSION,
  TABS,
  findField,
  fieldId,
  type Field,
  type GroupKey,
  type IslandTreeSettings,
  type SavedPreset,
  type SettingValue,
} from "./schema";

export interface ValidationReport {
  /** Fields that were present and valid (including ones that had to be limited). */
  applied: number;
  /** Fields missing from the data, which took their default. */
  defaulted: number;
  /** Numbers or text that were outside their limits and had to be adjusted. */
  clamped: string[];
  /** Values of the wrong type or not among the options, which took their default. */
  rejected: string[];
  /** Keys this version does not know about. */
  ignored: string[];
}

export function emptyReport(): ValidationReport {
  return { applied: 0, defaulted: 0, clamped: [], rejected: [], ignored: [] };
}

export type Coerced =
  | { status: "ok"; value: SettingValue }
  | { status: "clamped"; value: SettingValue }
  | { status: "rejected" };

const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** Replaces control characters (including line breaks) with spaces. */
function withoutControlCharacters(text: string): string {
  return Array.from(text, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127 ? " " : character;
  }).join("");
}

/** Rounds away floating point noise such as 0.30000000000000004. */
function tidy(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Checks one value against its field. Returns the value to use and whether it
 * was fine, had to be limited, or was unusable.
 */
export function coerceField(field: Field, value: unknown): Coerced {
  const def = field.def;
  switch (def.kind) {
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) return { status: "rejected" };
      const limited = Math.min(def.max, Math.max(def.min, value));
      const snapped = tidy(Math.round((limited - def.min) / def.step) * def.step + def.min);
      const final = Math.min(def.max, Math.max(def.min, snapped));
      return { status: limited === value ? "ok" : "clamped", value: final };
    }
    case "enum": {
      const option = def.options.find((o) => o.value === value);
      return option ? { status: "ok", value: option.value } : { status: "rejected" };
    }
    case "boolean":
      return typeof value === "boolean" ? { status: "ok", value } : { status: "rejected" };
    case "colour": {
      if (value === "") return { status: "ok", value: "" };
      if (typeof value === "string" && HEX_COLOUR.test(value)) {
        return { status: "ok", value: value.toLowerCase() };
      }
      return { status: "rejected" };
    }
    case "text": {
      if (typeof value !== "string") return { status: "rejected" };
      const cleaned = withoutControlCharacters(value).trim();
      if (cleaned === "") return { status: "rejected" };
      if (cleaned.length > def.maxLength) {
        return { status: "clamped", value: cleaned.slice(0, def.maxLength) };
      }
      return { status: "ok", value: cleaned };
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const TAB_LABEL = new Map<string, string>(TABS.map((tab) => [tab.id, tab.label]));

function describeField(field: Field): string {
  const where = TAB_LABEL.get(field.tab) ?? field.group;
  return `${where}: ${field.label}`;
}

function show(value: unknown): string {
  return typeof value === "string" ? `"${value.slice(0, 40)}"` : String(value);
}

const GROUPS: readonly GroupKey[] = ["cards", "lines", "canvas", "layout", "editing"];
const MAX_PRESETS = 30;
export const PRESET_NAME_MAX = 40;
export const BUILT_IN_PRESET_NAMES: readonly string[] = ["Compact", "Comfortable", "Large"];

/** Cleans a preset name: no control characters, single spaces, at most 40 characters. */
export function cleanPresetName(name: string): string {
  return withoutControlCharacters(name).replace(/\s+/g, " ").trim().slice(0, PRESET_NAME_MAX);
}

function sanitisePresets(raw: unknown, report: ValidationReport): SavedPreset[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    report.rejected.push("Presets: the list of saved presets was not a list");
    return [];
  }
  const presets: SavedPreset[] = [];
  const seen = new Set(BUILT_IN_PRESET_NAMES.map((name) => name.toLowerCase()));
  for (const entry of raw) {
    if (presets.length >= MAX_PRESETS) {
      report.ignored.push(`Presets: more than ${MAX_PRESETS} presets, the rest were left out`);
      break;
    }
    if (!isRecord(entry) || typeof entry.name !== "string" || !isRecord(entry.values)) {
      report.rejected.push("Presets: a saved preset was not valid and was left out");
      continue;
    }
    const name = cleanPresetName(entry.name);
    if (name === "" || seen.has(name.toLowerCase())) {
      report.ignored.push(`Presets: "${name || "(no name)"}" has no usable name or the name is already taken`);
      continue;
    }
    const values: Record<string, SettingValue> = {};
    for (const [id, value] of Object.entries(entry.values)) {
      const field = findField(id);
      if (!field || !field.inPreset) {
        report.ignored.push(`Presets: "${name}" has an unknown setting ${id.slice(0, 40)}`);
        continue;
      }
      const result = coerceField(field, value);
      if (result.status !== "rejected") values[id] = result.value;
      else report.rejected.push(`Presets: "${name}" has an unusable ${field.label}`);
    }
    seen.add(name.toLowerCase());
    presets.push({ name, values });
  }
  return presets;
}

/**
 * Builds valid settings from anything. Never throws. Fields that are missing or
 * unusable take their default, and the report says which.
 */
export function sanitiseSettings(raw: unknown): { settings: IslandTreeSettings; report: ValidationReport } {
  const report = emptyReport();
  const source = isRecord(raw) ? raw : {};
  const groups: Record<GroupKey, Record<string, SettingValue>> = {
    cards: {}, lines: {}, canvas: {}, layout: {}, editing: {},
  };

  for (const field of FIELDS) {
    const group = source[field.group];
    const value = isRecord(group) ? group[field.key] : undefined;
    if (value === undefined) {
      groups[field.group][field.key] = field.def.default;
      report.defaulted += 1;
      continue;
    }
    const result = coerceField(field, value);
    if (result.status === "rejected") {
      groups[field.group][field.key] = field.def.default;
      report.rejected.push(`${describeField(field)}: ${show(value)} is not allowed, so the default was used`);
    } else {
      groups[field.group][field.key] = result.value;
      report.applied += 1;
      if (result.status === "clamped") {
        report.clamped.push(`${describeField(field)}: ${show(value)} was adjusted to ${show(result.value)}`);
      }
    }
  }

  // Keys this version does not know about are left out, and said so.
  const known = new Set(FIELDS.map((f) => fieldId(f)));
  for (const group of GROUPS) {
    const object = source[group];
    if (!isRecord(object)) continue;
    for (const key of Object.keys(object)) {
      if (!known.has(`${group}.${key}`)) report.ignored.push(`Unknown setting ${group}.${key.slice(0, 40)}`);
    }
  }
  for (const key of Object.keys(source)) {
    if (key !== "version" && key !== "presets" && !GROUPS.includes(key as GroupKey)) {
      report.ignored.push(`Unknown section ${key.slice(0, 40)}`);
    }
  }

  const settings = {
    version: SETTINGS_VERSION,
    ...groups,
    presets: sanitisePresets(source.presets, report),
  } as unknown as IslandTreeSettings;
  return { settings, report };
}

/**
 * Brings data saved by an older version up to the current shape. Version 1 kept
 * `defaultLayout` and `statusProperty` at the top level; they now live in groups.
 */
export function migrateSettings(data: unknown): unknown {
  if (!isRecord(data)) return {};
  if (data.version === 1 || data.version === undefined) {
    const migrated: Record<string, unknown> = { ...data, version: SETTINGS_VERSION };
    delete migrated.defaultLayout;
    delete migrated.statusProperty;
    if (data.defaultLayout !== undefined) {
      migrated.layout = { ...(isRecord(data.layout) ? data.layout : {}), defaultLayout: data.defaultLayout };
    }
    if (data.statusProperty !== undefined) {
      migrated.cards = { ...(isRecord(data.cards) ? data.cards : {}), statusProperty: data.statusProperty };
    }
    return migrated;
  }
  return data;
}

/** Loads whatever was saved, however old, as valid settings. */
export function loadSettingsFrom(data: unknown): IslandTreeSettings {
  return sanitiseSettings(migrateSettings(data)).settings;
}

export { DEFAULT_SETTINGS };
