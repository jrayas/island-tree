/**
 * SVG path data for the curved branches between cards.
 *
 * Pure string building so the curve shape can be tested without a browser.
 */

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
