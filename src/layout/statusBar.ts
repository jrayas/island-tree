/**
 * How far to lift the details text to clear Obsidian's status bar.
 *
 * Obsidian's default theme floats the status bar over the bottom-right corner of the
 * window instead of giving it a row of its own, so a pane in that corner is covered
 * by it. Whether it is shown, how tall it is and whether it reaches the text depend on
 * the theme, layout and text length, so the answer is measured rather than guessed.
 * Pure geometry, so it is unit tested without a DOM.
 */

/** A rectangle in the same coordinate space as another (viewport pixels). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Space left between the lifted text and the top of the status bar. */
export const STATUS_BAR_BREATHING_ROOM = 4;

/**
 * The bottom offset, in pixels, the text needs to sit above the status bar, or 0 when the
 * bar does not cover it (hidden, absent, elsewhere in the window, or beside the text). The
 * caller keeps whichever is larger of this and the normal edge gap, so when the bar is
 * hidden the text drops back to the plain gap with no leftover lift.
 *
 * Why only the text's sideways extent is passed: its height does not matter (it grows
 * upward from the lift) and using its top or bottom would make the answer depend on the
 * lift it is about to set. An empty text (no width) never needs lifting.
 */
export function statusBarClearance(view: Box, bar: Box | null, text: Pick<Box, "left" | "right"> | null): number {
  if (!bar || !text) return 0;
  if (bar.right <= bar.left || bar.bottom <= bar.top) return 0; // not rendered (display: none)
  if (text.right <= text.left) return 0;
  const overlapsView =
    bar.top < view.bottom && bar.bottom > view.top && bar.left < view.right && bar.right > view.left;
  if (!overlapsView) return 0;
  // The bar only matters if it reaches the text sideways.
  if (bar.left >= text.right || bar.right <= text.left) return 0;
  const rise = view.bottom - bar.top;
  return rise > 0 ? rise + STATUS_BAR_BREATHING_ROOM : 0;
}
