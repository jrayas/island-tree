/**
 * The link between the dashboard and the Obsidian view that hosts it, for remembering how it
 * was left.
 *
 * The app fills in `snapshot` and `restore` while it is mounted. The view reads `snapshot`
 * when Obsidian asks for the saved state (leaving for a note, closing, saving the layout) and
 * calls `restore` when Obsidian hands a state back (Back, or a restart). The app calls
 * `changed` when its view changes, so the view can ask Obsidian to save the layout.
 */
import type { SavedView } from "../model/savedView";

export interface StateBridge {
  snapshot: (() => SavedView) | null;
  restore: ((saved: SavedView) => void) | null;
  changed: (() => void) | null;
}

export function createStateBridge(): StateBridge {
  return { snapshot: null, restore: null, changed: null };
}
