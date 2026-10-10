/**
 * Compact density: the dashboard drawn with smaller cards and tighter spacing.
 *
 * It is an overlay on the settings, not a change to them. The toolbar's Compact
 * button only flips `layout.density`; the dashboard reads the settings through
 * `withDensity`, so the saved sizes are never touched and switching back is
 * always exact, even after a restart.
 */
import { BUILT_IN_PRESETS } from "./presets";
import { findField, withFieldValue, type IslandTreeSettings, type SettingValue } from "./schema";

/** The size and spacing settings that Compact draws smaller. They are the Compact preset's own. */
const COMPACT_SIZES: Readonly<Record<string, SettingValue>> =
  BUILT_IN_PRESETS.find((preset) => preset.name === "Compact")?.values ?? {};

/** The setting whose 0 means "the theme's text size" rather than "no text". */
const THEME_TEXT = "cards.fontSize";

/**
 * The settings the dashboard should draw with. Comfortable returns them as they
 * are. Compact lowers each size and spacing setting to the Compact value, but
 * never raises one, so a person who already chose smaller cards, or a square
 * corner, keeps that.
 */
export function withDensity(settings: IslandTreeSettings): IslandTreeSettings {
  if (settings.layout.density !== "compact") return settings;
  let next = settings;
  for (const [id, compact] of Object.entries(COMPACT_SIZES)) {
    const field = findField(id);
    if (!field || typeof compact !== "number") continue;
    const own = (next as unknown as Record<string, Record<string, unknown>>)[field.group]?.[field.key];
    if (typeof own !== "number") continue;
    // A text size of 0 follows the theme, which is larger than the Compact size.
    const value = id === THEME_TEXT && own === 0 ? compact : Math.min(own, compact);
    if (value !== own) next = withFieldValue(next, field, value);
  }
  return next;
}
