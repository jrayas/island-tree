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
  /**
   * The card's height. When given, a ring that would crowd its cards together grows until they
   * clear each other; without it the rings are exactly as configured.
   */
  cardHeight?: number;
  /** Space kept between neighbouring cards on a ring when it has to grow. */
  gap?: number;
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

  // Pass one: each card's angle. Walking the tree in order visits the cards of a ring in order
  // around it, so the angles of one ring come out sorted.
  const placed: { id: string; angle: number; depth: number }[] = [];
  const anglesByDepth: number[][] = [];
  const spread = (node: LayoutNode, from: number, to: number, depth: number): void => {
    const angle = (from + to) / 2;
    placed.push({ id: node.id, angle, depth });
    (anglesByDepth[depth] ??= []).push(angle);

    const total = leafCount(node);
    let start = from;
    for (const child of node.children) {
      const span = ((to - from) * leafCount(child)) / total;
      spread(child, start, start + span, depth + 1);
      start += span;
    }
  };
  // Start straight up and sweep a full turn.
  spread(root, -Math.PI / 2, 1.5 * Math.PI, 0);

  // Pass two: each ring's radius, pushed out where its cards would otherwise touch.
  const cardHeight = options.cardHeight;
  const gap = options.gap ?? 0;
  const ringRadii: number[] = [];
  for (let depth = 0; depth < anglesByDepth.length; depth++) {
    const wanted = ringRadius(depth, radii, ringStep, scale);
    const previous = ringRadii[depth - 1];
    // Never closer to the ring inside than the settings say.
    let radius =
      previous === undefined
        ? wanted
        : Math.max(wanted, previous + wanted - ringRadius(depth - 1, radii, ringStep, scale));
    if (cardHeight !== undefined && depth > 0) {
      radius = Math.max(
        radius,
        radiusToClear(anglesByDepth[depth] ?? [], cardWidth, cardHeight, gap),
      );
    }
    ringRadii.push(radius);
  }

  const outermost = ringRadii[ringRadii.length - 1] ?? 0;
  const half = outermost + cardWidth / 2 + margin;
  const positions: LayoutResult["positions"] = new Map();
  for (const { id, angle, depth } of placed) {
    const radius = ringRadii[depth] ?? 0;
    positions.set(id, {
      x: half + radius * Math.cos(angle),
      y: half + radius * Math.sin(angle),
    });
  }
  return { positions, width: 2 * half, height: 2 * half, centre: { x: half, y: half } };
}

/**
 * The smallest ring radius at which neighbouring cards, at these angles, do not overlap.
 *
 * Two neighbours are `chord` apart, in the direction of the ring's tangent; two cards of
 * `width` by `height` clear each other once they are far enough apart sideways or up and down,
 * whichever the tangent allows sooner.
 */
export function radiusToClear(
  angles: readonly number[],
  width: number,
  height: number,
  gap: number,
): number {
  if (angles.length < 2) return 0;
  let needed = 0;
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    const next = angles[(i + 1) % angles.length];
    const between = i + 1 < angles.length ? next - a : next + 2 * Math.PI - a;
    // Past half a turn apart, the cards get further from each other the other way round.
    const separation = Math.min(between, Math.PI);
    const tangent = a + between / 2 + Math.PI / 2;
    const across = Math.abs(Math.cos(tangent));
    const up = Math.abs(Math.sin(tangent));
    const distance = Math.min(across < 1e-9 ? Infinity : width / across, up < 1e-9 ? Infinity : height / up);
    const chord = 2 * Math.sin(Math.max(separation, 1e-6) / 2);
    needed = Math.max(needed, (distance + gap) / chord);
  }
  return needed;
}
