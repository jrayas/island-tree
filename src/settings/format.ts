/**
 * Wording for setting values on the settings page.
 *
 * Kept apart from the controls so it can be unit tested without Obsidian.
 */
import type { NumberDef } from "./schema";

/** A slider value with its unit, or what zero means when zero has a special meaning. */
export function formatNumber(def: NumberDef, value: number): string {
  if (value === 0 && def.zeroMeans) return def.zeroMeans;
  return def.unit ? `${value} ${def.unit}` : String(value);
}

/** The pattern behind the preview's cards, as CSS for the grid type chosen. */
export function previewGrid(
  type: "dots" | "lines" | "none",
  size: number,
  spacing: number,
): { image: string; size: string } {
  const colour = "var(--island-grid-colour, var(--background-modifier-border-hover))";
  const cell = `${spacing}px ${spacing}px`;
  if (type === "dots") {
    return { image: `radial-gradient(circle, ${colour} ${size}px, transparent ${size + 0.5}px)`, size: cell };
  }
  if (type === "lines") {
    return {
      image: `linear-gradient(${colour} ${size}px, transparent ${size}px), linear-gradient(90deg, ${colour} ${size}px, transparent ${size}px)`,
      size: cell,
    };
  }
  return { image: "none", size: "auto" };
}
