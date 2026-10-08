/**
 * How much a card shows at a given zoom (SPEC.md section 6, "semantic zoom").
 *
 * Far out, cards cannot be read anyway, so they shrink to a type colour and a
 * short name. Close in there is room for the detail row.
 */

export type ZoomLevel = "minimal" | "normal" | "detailed";

/** Below this zoom a card shows only its type colour and a short name. */
export const MINIMAL_BELOW = 0.45;
/** From this zoom a card may show its detail row. */
export const DETAILED_FROM = 0.7;

export function zoomLevel(zoom: number): ZoomLevel {
  if (!Number.isFinite(zoom)) return "normal";
  if (zoom < MINIMAL_BELOW) return "minimal";
  return zoom >= DETAILED_FROM ? "detailed" : "normal";
}
