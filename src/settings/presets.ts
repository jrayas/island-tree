/**
 * Presets and resets.
 *
 * A preset is a named look: every appearance and layout setting, but not the
 * status property name or the editing behaviour, which belong to the person
 * rather than the look. Applying a preset first returns the look to its
 * defaults and then sets the preset's values, so a built-in that only changes a
 * few things still gives a predictable result.
 */
import {
  DEFAULT_SETTINGS,
  FIELDS,
  fieldId,
  withFieldValue,
  getFieldValue,
  type IslandTreeSettings,
  type SavedPreset,
  type SettingValue,
  type TabId,
} from "./schema";
import { BUILT_IN_PRESET_NAMES, PRESET_NAME_MAX, cleanPresetName } from "./validate";

export interface BuiltInPreset {
  name: string;
  description: string;
  values: Readonly<Record<string, SettingValue>>;
}

export const BUILT_IN_PRESETS: readonly BuiltInPreset[] = [
  {
    name: "Compact",
    description: "Smaller cards and tighter spacing, to fit more on screen.",
    values: {
      "cards.width": 100,
      "cards.height": 34,
      "cards.radius": 17,
      "cards.paddingX": 10,
      "cards.fontSize": 12,
      "layout.gap": 10,
      "layout.levelGap": 34,
      "layout.ringRadius": 100,
      "layout.ringStep": 70,
    },
  },
  {
    name: "Comfortable",
    description: "The standard look.",
    values: {},
  },
  {
    name: "Large",
    description: "Bigger cards, larger text and more space between them.",
    values: {
      "cards.width": 136,
      "cards.height": 48,
      "cards.radius": 24,
      "cards.paddingX": 14,
      "cards.fontSize": 15,
      "layout.gap": 18,
      "layout.levelGap": 54,
      "layout.ringRadius": 150,
      "layout.ringStep": 110,
    },
  },
];

const PRESET_FIELDS = FIELDS.filter((field) => field.inPreset);

/** A preset's values for the whole look, taken from the current settings. */
export function lookOf(settings: IslandTreeSettings): Record<string, SettingValue> {
  const values: Record<string, SettingValue> = {};
  for (const field of PRESET_FIELDS) {
    values[fieldId(field)] = getFieldValue(settings, field) as SettingValue;
  }
  return values;
}

/**
 * Applies a look: every look setting takes the preset's value, or its default
 * when the preset does not say. Settings outside the look are untouched.
 */
export function applyLook(
  settings: IslandTreeSettings,
  values: Readonly<Record<string, SettingValue>>,
): IslandTreeSettings {
  let next = settings;
  for (const field of PRESET_FIELDS) {
    next = withFieldValue(next, field, values[fieldId(field)] ?? field.def.default);
  }
  return next;
}

export function applyPreset(
  settings: IslandTreeSettings,
  preset: Pick<SavedPreset, "values">,
): IslandTreeSettings {
  return applyLook(settings, preset.values);
}

export type PresetNameCheck = { ok: true; name: string } | { ok: false; reason: string };

/** Checks a name for a new or renamed preset. `ignore` is the preset being renamed. */
export function checkPresetName(
  raw: string,
  existing: readonly string[],
  ignore?: string,
): PresetNameCheck {
  const name = cleanPresetName(raw);
  if (name === "") return { ok: false, reason: "Give the preset a name." };
  if (raw.trim().length > PRESET_NAME_MAX) {
    return { ok: false, reason: `Use ${PRESET_NAME_MAX} characters or fewer.` };
  }
  const lower = name.toLowerCase();
  if (BUILT_IN_PRESET_NAMES.some((builtIn) => builtIn.toLowerCase() === lower)) {
    return { ok: false, reason: "That name belongs to a built-in preset." };
  }
  const clash = existing.some(
    (other) => other.toLowerCase() === lower && other.toLowerCase() !== ignore?.toLowerCase(),
  );
  if (clash) return { ok: false, reason: "A preset with that name already exists." };
  return { ok: true, name };
}

export type PresetResult =
  | { ok: true; settings: IslandTreeSettings; name: string }
  | { ok: false; reason: string };

const MAX_SAVED = 30;

/** Saves the current look under a new name. */
export function saveCurrentAsPreset(settings: IslandTreeSettings, rawName: string): PresetResult {
  const check = checkPresetName(rawName, settings.presets.map((p) => p.name));
  if (!check.ok) return check;
  if (settings.presets.length >= MAX_SAVED) {
    return { ok: false, reason: `You can keep up to ${MAX_SAVED} presets. Delete one first.` };
  }
  const preset: SavedPreset = { name: check.name, values: lookOf(settings) };
  return { ok: true, name: check.name, settings: { ...settings, presets: [...settings.presets, preset] } };
}

export function renamePreset(settings: IslandTreeSettings, oldName: string, rawName: string): PresetResult {
  const check = checkPresetName(rawName, settings.presets.map((p) => p.name), oldName);
  if (!check.ok) return check;
  if (!settings.presets.some((p) => p.name === oldName)) {
    return { ok: false, reason: "That preset no longer exists." };
  }
  return {
    ok: true,
    name: check.name,
    settings: {
      ...settings,
      presets: settings.presets.map((p) => (p.name === oldName ? { ...p, name: check.name } : p)),
    },
  };
}

export function deletePreset(settings: IslandTreeSettings, name: string): IslandTreeSettings {
  return { ...settings, presets: settings.presets.filter((p) => p.name !== name) };
}

/** Puts every setting on one tab back to its default. */
export function resetTab(settings: IslandTreeSettings, tab: TabId): IslandTreeSettings {
  let next = settings;
  for (const field of FIELDS) {
    if (field.tab === tab) next = withFieldValue(next, field, field.def.default);
  }
  return next;
}

/** Puts every setting back to its default. Saved presets are kept. */
export function resetEverything(settings: IslandTreeSettings): IslandTreeSettings {
  return { ...DEFAULT_SETTINGS, presets: settings.presets };
}
