/**
 * The box around a set of cards, used to fit the camera to where cards are going.
 *
 * Fitting has to use the target positions, not the nodes' current ones, because
 * the cards are still gliding when the camera moves.
 */
import type { Point } from "./types";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The smallest box containing every card, given card centres and the card size. */
export function boundsOfCards(
  centres: Iterable<Point>,
  cardWidth: number,
  cardHeight: number,
): Box | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of centres) {
    minX = Math.min(minX, x - cardWidth / 2);
    minY = Math.min(minY, y - cardHeight / 2);
    maxX = Math.max(maxX, x + cardWidth / 2);
    maxY = Math.max(maxY, y + cardHeight / 2);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
