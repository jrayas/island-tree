/**
 * The zoom limits and the close-up view.
 *
 * A "view" is Svelte Flow's own: where the flow origin sits in the pane, and the zoom. The close-up is
 * a reading-sized view put on a chosen point: full size, then three clicks of the zoom out button.
 */
import type { View } from "./autoScroll";
import type { Point } from "./types";

/**
 * The zoom limits the canvas allows. The floor is low enough for Fit to show a very wide tree whole
 * (at 2% a card is only a couple of pixels wide).
 */
export const CAMERA_MIN_ZOOM = 0.02;
export const CAMERA_MAX_ZOOM = 2;

/** How much one click of the zoom buttons changes the zoom. This is Svelte Flow's own step. */
export const ZOOM_STEP = 1.2;

/** The close-up is full size, zoomed out this many clicks. */
export const CLOSE_UP_STEPS = 3;

/** About 58%: big enough to read every card, with room around it to see its neighbours. */
export const CLOSE_UP_ZOOM = 1 / ZOOM_STEP ** CLOSE_UP_STEPS;

export interface Pane {
  width: number;
  height: number;
}

/** The point of the cards that is in the middle of the pane. */
export function viewCentre(view: View, pane: Pane): Point {
  return { x: (pane.width / 2 - view.x) / view.zoom, y: (pane.height / 2 - view.y) / view.zoom };
}

/** The view that puts `target` in the middle of a pane of this size at the close-up zoom. */
export function closeUpView(target: Point, pane: Pane): View {
  return {
    x: pane.width / 2 - target.x * CLOSE_UP_ZOOM,
    y: pane.height / 2 - target.y * CLOSE_UP_ZOOM,
    zoom: CLOSE_UP_ZOOM,
  };
}
