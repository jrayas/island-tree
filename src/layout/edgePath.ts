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
