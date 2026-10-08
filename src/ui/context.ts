/**
 * Lets a card reach the app without carrying functions or shared state in its
 * node data.
 *
 * Svelte Flow checks that node data can be structured-cloned (to catch deeply
 * reactive state) and warns when it cannot, which functions in the data would
 * trigger on every render. Context keeps the data plain.
 */
import { getContext, setContext } from "svelte";
import type { ZoomState } from "./zoomState.svelte";

export interface CanvasActions {
  /** The folder badge was clicked: show or hide just this folder's files. */
  onbadge: (id: string) => void;
  /** A card was double-clicked: focus a folder, or open a file. */
  onopen: (id: string, modifiers: { ctrlKey: boolean; metaKey: boolean }) => void;
}

const ACTIONS_KEY = Symbol("island-tree-canvas-actions");
const ZOOM_KEY = Symbol("island-tree-zoom");

export function provideCanvasActions(actions: CanvasActions): void {
  setContext(ACTIONS_KEY, actions);
}

export function useCanvasActions(): CanvasActions {
  return getContext<CanvasActions>(ACTIONS_KEY);
}

export function provideZoom(zoom: ZoomState): void {
  setContext(ZOOM_KEY, zoom);
}

export function useZoom(): ZoomState {
  return getContext<ZoomState>(ZOOM_KEY);
}
