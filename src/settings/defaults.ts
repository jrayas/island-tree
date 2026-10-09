/**
 * Default settings and the number-clamping helper.
 *
 * The defaults themselves come from the table in `schema.ts`; this file is the
 * short import for code that just wants them (SPEC.md section 3).
 */
export { DEFAULT_SETTINGS, SETTINGS_VERSION } from "./schema";
export type { IslandTreeSettings } from "./schema";
export type { LayoutMode } from "../layout/types";

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
