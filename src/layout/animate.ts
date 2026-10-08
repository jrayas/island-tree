/**
 * Frame-by-frame easing of card positions.
 *
 * Why not CSS transitions: edges are drawn from the nodes' current positions, so
 * if only the cards glided the branches would jump to the end state and detach.
 * Stepping the positions ourselves keeps every edge attached while cards move
 * (SPEC.md section 5). These functions are pure; the canvas owns the frame loop.
 */
import type { Point } from "./types";

/** The mockup eases about 20 percent of the remaining distance per 60 Hz frame. */
export const BASE_EASE = 0.2;
const FRAME_MS = 1000 / 60;

/**
 * Easing factor for a frame of `dtMs`, so motion takes the same time on 30, 60
 * and 144 Hz screens. Compounds the per-frame fraction over the elapsed frames.
 */
export function easeFactor(dtMs: number, base: number = BASE_EASE): number {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return 0;
  return 1 - Math.pow(1 - base, dtMs / FRAME_MS);
}

export interface PlacedId {
  id: string;
  parentId: string | null;
}

/**
 * Prepares the current positions for a new set of targets. Cards that already
 * exist keep their position; new cards start at their parent's current position
 * so they grow out of it; cards no longer in `order` are dropped. `order` must
 * list parents before children so a new child can start from a new parent.
 */
export function seedPositions(
  current: ReadonlyMap<string, Point>,
  targets: ReadonlyMap<string, Point>,
  order: readonly PlacedId[],
): Map<string, Point> {
  const next = new Map<string, Point>();
  for (const { id, parentId } of order) {
    const existing = current.get(id);
    if (existing) {
      next.set(id, existing);
      continue;
    }
    const origin = (parentId !== null && next.get(parentId)) || targets.get(id);
    if (origin) next.set(id, { ...origin });
  }
  return next;
}

/**
 * Moves each position `factor` of the way to its target. A position within
 * `epsilon` of its target snaps to it, so the loop can stop instead of creeping
 * for ever. `settled` is true once every card is at its target.
 */
export function stepPositions(
  current: ReadonlyMap<string, Point>,
  targets: ReadonlyMap<string, Point>,
  factor: number,
  epsilon = 0.5,
): { positions: Map<string, Point>; settled: boolean } {
  const positions = new Map<string, Point>();
  let settled = true;
  for (const [id, target] of targets) {
    const from = current.get(id) ?? target;
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    if (Math.hypot(dx, dy) <= epsilon) {
      positions.set(id, { ...target });
      continue;
    }
    settled = false;
    positions.set(id, { x: from.x + dx * factor, y: from.y + dy * factor });
  }
  return { positions, settled };
}
