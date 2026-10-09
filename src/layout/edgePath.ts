/**
 * SVG path data for the curved branches between cards.
 *
 * Pure string building so the curve shape can be tested without a browser.
 */
import type { CurveStyle, MindSide } from "./types";

/**
 * A cubic curve that leaves the parent downwards and enters the child from
 * above, with both control points on the mid height. This gives the smooth
 * S-shaped branch seen in the mockup. Radial branches arrive in milestone 3.
 */
export function verticalBranchPath(sx: number, sy: number, tx: number, ty: number): string {
  const midY = (sy + ty) / 2;
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
}

/**
 * A cubic curve for the radial layout. Both control points sit on the mid
 * radius, one at the parent's angle and one at the child's, so branches leave
 * along the parent's spoke and arrive along the child's, fanning out smoothly.
 * The root sits on the centre, where it has no angle of its own, so it borrows
 * the child's.
 */
export function radialBranchPath(
  centre: { x: number; y: number },
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  const sourceRadius = Math.hypot(sx - centre.x, sy - centre.y);
  const targetRadius = Math.hypot(tx - centre.x, ty - centre.y);
  const targetAngle = Math.atan2(ty - centre.y, tx - centre.x);
  const sourceAngle = sourceRadius < 1e-6 ? targetAngle : Math.atan2(sy - centre.y, sx - centre.x);
  const mid = (sourceRadius + targetRadius) / 2;
  const c1x = centre.x + mid * Math.cos(sourceAngle);
  const c1y = centre.y + mid * Math.sin(sourceAngle);
  const c2x = centre.x + mid * Math.cos(targetAngle);
  const c2y = centre.y + mid * Math.sin(targetAngle);
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

/** Down, across, down: the right-angled branch of the vertical layout. */
export function verticalStepPath(sx: number, sy: number, tx: number, ty: number): string {
  const midY = (sy + ty) / 2;
  return `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
}

/**
 * Out along the parent's spoke, across at the mid radius, then in along the
 * child's spoke: the stepped branch of the radial layout. The across leg is a
 * straight chord, which reads as a corner at small angles.
 */
export function radialStepPath(
  centre: { x: number; y: number },
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  const sourceRadius = Math.hypot(sx - centre.x, sy - centre.y);
  const targetRadius = Math.hypot(tx - centre.x, ty - centre.y);
  const targetAngle = Math.atan2(ty - centre.y, tx - centre.x);
  const sourceAngle = sourceRadius < 1e-6 ? targetAngle : Math.atan2(sy - centre.y, sx - centre.x);
  const mid = (sourceRadius + targetRadius) / 2;
  const ax = centre.x + mid * Math.cos(sourceAngle);
  const ay = centre.y + mid * Math.sin(sourceAngle);
  const bx = centre.x + mid * Math.cos(targetAngle);
  const by = centre.y + mid * Math.sin(targetAngle);
  return `M ${sx} ${sy} L ${ax} ${ay} L ${bx} ${by} L ${tx} ${ty}`;
}

/** A plain line between two cards. */
export function straightPath(sx: number, sy: number, tx: number, ty: number): string {
  return `M ${sx} ${sy} L ${tx} ${ty}`;
}

/**
 * The branch between two cards for the chosen curve style. `centre` is the
 * middle of a radial layout, or null for the vertical layout. Used by the
 * dashboard's branches and by the settings preview, so they always agree.
 */
export function branchPath(
  style: CurveStyle,
  centre: { x: number; y: number } | null,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  if (style === "straight") return straightPath(sx, sy, tx, ty);
  if (style === "step") {
    return centre ? radialStepPath(centre, sx, sy, tx, ty) : verticalStepPath(sx, sy, tx, ty);
  }
  return centre ? radialBranchPath(centre, sx, sy, tx, ty) : verticalBranchPath(sx, sy, tx, ty);
}

/** Corner radius of the mind map's elbow branches, in canvas units. */
export const MIND_MAP_ELBOW_RADIUS = 10;

/**
 * A smooth S-curve that leaves a card horizontally and arrives horizontally, with both
 * control points on the middle column line. Both ends are given as edge points.
 */
export function mindMapCurvePath(sx: number, sy: number, tx: number, ty: number): string {
  const midX = (sx + tx) / 2;
  return `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
}

/**
 * Across, up or down, across, with rounded corners: the elbow branch of the mind map. The
 * corner radius shrinks when the cards are close, and a level connection is a plain line.
 */
export function mindMapElbowPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  radius: number = MIND_MAP_ELBOW_RADIUS,
): string {
  const dy = ty - sy;
  if (Math.abs(dy) < 1) return `M ${sx} ${sy} L ${tx} ${ty}`;
  const midX = (sx + tx) / 2;
  const across = tx >= sx ? 1 : -1;
  const down = dy > 0 ? 1 : -1;
  const r = Math.min(radius, Math.abs(dy) / 2, Math.abs(tx - sx) / 2);
  return [
    `M ${sx} ${sy}`,
    `L ${midX - across * r} ${sy}`,
    `Q ${midX} ${sy}, ${midX} ${sy + down * r}`,
    `L ${midX} ${ty - down * r}`,
    `Q ${midX} ${ty}, ${midX + across * r} ${ty}`,
    `L ${tx} ${ty}`,
  ].join(" ");
}

/**
 * The mind map branch between two card centres: from the edge of the parent nearest the child
 * to the edge of the child nearest the parent. `side` is the child's side of the root, so on
 * the right the branch runs right edge to left edge and on the left, left edge to right
 * edge. "Step" gives rounded elbows; "curved" and "straight" both give the S-curve, because
 * a straight line would be a diagonal.
 */
export function mindMapPath(
  style: CurveStyle,
  side: MindSide,
  cardWidth: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  const half = cardWidth / 2;
  const direction = side === "right" ? 1 : -1;
  const startX = sx + direction * half;
  const endX = tx - direction * half;
  return style === "step" ? mindMapElbowPath(startX, sy, endX, ty) : mindMapCurvePath(startX, sy, endX, ty);
}
