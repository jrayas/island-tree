/**
 * Ring layout around the focus root.
 *
 * The root sits in the middle and each level is a ring around it. A card's slice
 * of its parent's angle is proportional to the visible leaves beneath it, so a
 * busy folder gets more room than an empty one (SPEC.md section 5). A pure
 * function, tested without any UI.
 */
import type { LayoutNode, LayoutResult } from "./types";

export interface RadialOptions {
  cardWidth: number;
  /** Ring radii for the first rings, from the centre outwards. Index 0 is the root. */
  radii: readonly number[];
  /** Extra distance for each ring beyond the configured ones. */
  ringStep: number;
  /** Multiplies every radius, used to give detailed cards more room. */
  scale?: number;
  /** Space kept clear beyond the outermost card. */
  margin?: number;
}

/** The mockup's rings, used until the settings milestone makes them configurable. */
export const DEFAULT_RADII: readonly number[] = [0, 125, 235, 335, 425];
export const DEFAULT_RING_STEP = 90;

/**
 * Radius of the ring at `depth`. Past the configured rings it grows by a fixed
 * step, so very deep trees keep spreading instead of piling up.
 */
export function ringRadius(
  depth: number,
  radii: readonly number[],
  ringStep: number,
  scale = 1,
): number {
  const last = radii.length - 1;
  const base = depth <= last ? (radii[depth] ?? 0) : (radii[last] ?? 0) + (depth - last) * ringStep;
  return base * scale;
}

export function layoutRadial(root: LayoutNode, options: RadialOptions): LayoutResult {
  const { cardWidth, radii, ringStep, scale = 1, margin = 10 } = options;
  const leaves = new Map<string, number>();

  // A node's weight is the number of visible leaves beneath it (itself if it has none).
  const leafCount = (node: LayoutNode): number => {
    const known = leaves.get(node.id);
    if (known !== undefined) return known;
    let count = 0;
    for (const child of node.children) count += leafCount(child);
    if (node.children.length === 0) count = 1;
    leaves.set(node.id, count);
    return count;
  };

  const deepest = (node: LayoutNode, depth: number): number =>
    node.children.reduce((max, child) => Math.max(max, deepest(child, depth + 1)), depth);

  const half = ringRadius(deepest(root, 0), radii, ringStep, scale) + cardWidth / 2 + margin;
  const positions: LayoutResult["positions"] = new Map();

  const place = (node: LayoutNode, from: number, to: number, depth: number): void => {
    const angle = (from + to) / 2;
    const radius = ringRadius(depth, radii, ringStep, scale);
    positions.set(node.id, {
      x: half + radius * Math.cos(angle),
      y: half + radius * Math.sin(angle),
    });

    const total = leafCount(node);
    let start = from;
    for (const child of node.children) {
      const span = ((to - from) * leafCount(child)) / total;
      place(child, start, start + span, depth + 1);
      start += span;
    }
  };

  // Start straight up and sweep a full turn.
  place(root, -Math.PI / 2, 1.5 * Math.PI, 0);
  return { positions, width: 2 * half, height: 2 * half, centre: { x: half, y: half } };
}
