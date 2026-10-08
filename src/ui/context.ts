/**
 * Lets a card call back into the app without carrying functions in its node data.
 *
 * Svelte Flow checks that node data can be structured-cloned (to catch deeply
 * reactive state) and warns when it cannot, which functions in the data would
 * trigger on every render. Context keeps the data plain.
 */
import { getContext, setContext } from "svelte";

export interface CanvasActions {
  /** The folder badge was clicked: show or hide just this folder's files. */
  onbadge: (id: string) => void;
  /** A card was double-clicked: focus a folder, or open a file. */
  onopen: (id: string, modifiers: { ctrlKey: boolean; metaKey: boolean }) => void;
}

const KEY = Symbol("island-tree-canvas-actions");

export function provideCanvasActions(actions: CanvasActions): void {
  setContext(KEY, actions);
}

export function useCanvasActions(): CanvasActions {
  return getContext<CanvasActions>(KEY);
}
