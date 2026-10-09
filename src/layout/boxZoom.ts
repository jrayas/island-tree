/**
 * The rules behind "Zoom to area": turning a dragged rectangle into a camera.
 *
 * Kept as pure functions so the awkward cases (a tiny accidental drag, a rectangle
 * dragged right to left, a very small box that would zoom in absurdly far) are unit
 * tested without a browser. Rectangles are in pane pixels until `rectToCanvas` converts
 * them to canvas units with the camera as it was when the drag ended.
 */
import type { Point } from "./types";

/** An axis-aligned rectangle. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The camera: where the canvas origin sits in the pane, and the zoom. */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/** A drag smaller than this, in either direction, is treated as an accidental click. */
export const MIN_BOX_SIZE = 20;
/** Space left around the chosen area, as a fraction of the pane on each side. */
export const BOX_PADDING = 0.08;
/** Zoom never goes past this, so a small box cannot zoom in absurdly far. */
export const BOX_MAX_ZOOM = 1.5;

/** The rectangle between two corners, whichever way the drag went. */
export function rectBetween(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** True when the rectangle is big enough to count as a deliberate choice of area. */
export function isDeliberateBox(rect: Rect, minSize: number = MIN_BOX_SIZE): boolean {
  return rect.width >= minSize && rect.height >= minSize;
}

/** Converts a pane-pixel rectangle to canvas units under the given camera. */
export function rectToCanvas(rect: Rect, camera: Camera): Rect {
  return {
    x: (rect.x - camera.x) / camera.zoom,
    y: (rect.y - camera.y) / camera.zoom,
    width: rect.width / camera.zoom,
    height: rect.height / camera.zoom,
  };
}

/**
 * The camera that fits a canvas-unit rectangle in the pane with padding, centred, with the
 * zoom held between `minZoom` and `maxZoom`. Why not the library's own helper: this one
 * is tested here and takes the zoom cap as a plain argument.
 */
export function cameraForRect(
  rect: Rect,
  paneWidth: number,
  paneHeight: number,
  limits: { minZoom: number; maxZoom: number },
  padding: number = BOX_PADDING,
): Camera {
  const roomX = paneWidth * (1 - 2 * padding);
  const roomY = paneHeight * (1 - 2 * padding);
  const fit = Math.min(roomX / rect.width, roomY / rect.height);
  const zoom = Math.min(limits.maxZoom, Math.max(limits.minZoom, fit));
  const centreX = rect.x + rect.width / 2;
  const centreY = rect.y + rect.height / 2;
  return { x: paneWidth / 2 - centreX * zoom, y: paneHeight / 2 - centreY * zoom, zoom };
}
