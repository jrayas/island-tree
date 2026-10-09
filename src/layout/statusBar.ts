/**
 * How far to lift the floating bottom elements to clear Obsidian's status bar.
 *
 * Obsidian's default theme floats the status bar over the bottom-right corner of the
 * window instead of giving it a row of its own, so a pane in that corner is covered
 * by it. Whether it is shown, how tall it is and whether it reaches this pane all
 * depend on the theme and layout, so the answer is measured rather than guessed.
 * Pure geometry, so it is unit tested without a DOM.
 */

/** A rectangle in the same coordinate space as another (viewport pixels). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Space left between the lifted elements and the top of the status bar. */
export const STATUS_BAR_BREATHING_ROOM = 4;

/**
 * The bottom offset, in pixels, the floating elements need to sit above the status bar,
 * or 0 when it does not cover this view (hidden, absent, or in another part of the window).
 * The caller keeps whichever is larger of this and the normal edge gap, so when the bar
 * is hidden the elements drop back to the plain gap with no leftover lift.
 *
 * Why only the bar's left edge is checked against the right inset: the details text sits
 * at the right, and a bar that starts left of it is above or below it, so it must be cleared.
 */
export function statusBarClearance(view: Box, bar: Box | null, edgeGap: number): number {
  if (!bar) return 0;
  if (bar.right <= bar.left || bar.bottom <= bar.top) return 0; // not rendered (display: none)
  const overlapsView =
    bar.top < view.bottom && bar.bottom > view.top && bar.left < view.right && bar.right > view.left;
  if (!overlapsView) return 0;
  // Only the bar's own right-hand side can reach the details text.
  if (bar.left >= view.right - edgeGap) return 0;
  const rise = view.bottom - bar.top;
  return rise > 0 ? rise + STATUS_BAR_BREATHING_ROOM : 0;
}
