/**
 * Settings shape, defaults and validation helpers.
 *
 * Milestone 1 holds only the fields needed to prove saving works. Later
 * milestones add the full set (see SPEC.md section 9) in this one typed object,
 * so defaults, ranges and import validation all live in a single place.
 */

import type { LayoutMode } from "../layout/types";

export type { LayoutMode };

export interface IslandTreeSettings {
  /** Schema version, so saved data can be migrated when fields change. */
  version: number;
  defaultLayout: LayoutMode;
  /** The frontmatter property whose value shows as a status chip on file cards. */
  statusProperty: string;
}

export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: IslandTreeSettings = {
  version: SETTINGS_VERSION,
  defaultLayout: "vertical",
  statusProperty: "status",
};

/**
 * Clamps a value into an inclusive range, falling back when it is not a usable
 * number. Imported or hand-edited settings are untrusted, so every numeric
 * setting passes through here instead of being used as given.
 */
export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
