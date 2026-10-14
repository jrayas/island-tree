/**
 * A saved camera: where the view was looking and how far it was zoomed, so one click can return to it.
 *
 * It stores the point in the cards' own coordinates that sat in the middle of the pane, not the raw
 * offset Svelte Flow keeps. That way, if the window is resized or a sidebar opens, going back still
 * centres on the same spot. One camera is kept per layout, because a position only means something
 * inside the layout it was saved in.
 */
import type { View } from "./autoScroll";
import type { LayoutMode } from "./types";

/** The point of the cards that is in the middle of the pane, and the zoom. */
export interface SavedCamera {
  x: number;
  y: number;
  zoom: number;
}

export type SavedCameras = Partial<Record<LayoutMode, SavedCamera>>;

/**
 * The zoom limits the canvas allows, so a bad saved value cannot leave the view stuck. The floor is
 * low enough for Fit to show a very wide tree whole (at 2% a card is only a couple of pixels wide).
 */
export const CAMERA_MIN_ZOOM = 0.02;
export const CAMERA_MAX_ZOOM = 2;

/** Further than this from the origin is not a place any layout reaches; it only bounds bad data. */
const MAX_COORDINATE = 1_000_000;

const LAYOUTS: readonly LayoutMode[] = ["vertical", "radial", "mindmap"];

const round = (value: number): number => Math.round(value * 100) / 100;

export interface Pane {
  width: number;
  height: number;
}

/** What the camera is looking at: the card-space point in the middle of the pane, and the zoom. */
export function cameraFromView(view: View, pane: Pane): SavedCamera {
  return {
    x: round((pane.width / 2 - view.x) / view.zoom),
    y: round((pane.height / 2 - view.y) / view.zoom),
    zoom: Math.round(view.zoom * 1000) / 1000,
  };
}

/** The view that puts a saved camera in the middle of a pane of this size. */
export function viewFromCamera(camera: SavedCamera, pane: Pane): View {
  return {
    x: pane.width / 2 - camera.x * camera.zoom,
    y: pane.height / 2 - camera.y * camera.zoom,
    zoom: camera.zoom,
  };
}

/** Reads one saved camera back, or null if it is missing or not usable. The zoom is kept in range. */
export function parseCamera(value: unknown): SavedCamera | null {
  if (typeof value !== "object" || value === null) return null;
  const { x, y, zoom } = value as Record<string, unknown>;
  if (typeof x !== "number" || typeof y !== "number" || typeof zoom !== "number") return null;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom)) return null;
  if (Math.abs(x) > MAX_COORDINATE || Math.abs(y) > MAX_COORDINATE) return null;
  return { x, y, zoom: Math.min(CAMERA_MAX_ZOOM, Math.max(CAMERA_MIN_ZOOM, zoom)) };
}

/** Reads the saved cameras back: only known layouts, only usable cameras. */
export function parseCameras(value: unknown): SavedCameras {
  const out: SavedCameras = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) return out;
  const record = value as Record<string, unknown>;
  for (const layout of LAYOUTS) {
    const camera = parseCamera(record[layout]);
    if (camera) out[layout] = camera;
  }
  return out;
}

/** The cameras with one layout's camera set, or removed when `camera` is null. */
export function withCamera(cameras: SavedCameras, layout: LayoutMode, camera: SavedCamera | null): SavedCameras {
  const next = { ...cameras };
  if (camera) next[layout] = camera;
  else delete next[layout];
  return next;
}
