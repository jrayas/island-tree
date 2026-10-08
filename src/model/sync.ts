/**
 * Keeps the view state valid after the vault changes.
 *
 * When files are deleted or moved the saved state can name cards that no longer
 * exist. Unknown ids are harmless in the sets but a stale selection or focus
 * would leave the view pointing at nothing, so they are cleared here.
 */
import type { ViewState } from "./viewState";

function onlyValid(set: ReadonlySet<string>, valid: ReadonlySet<string>): ReadonlySet<string> {
  for (const uid of set) {
    if (!valid.has(uid)) return new Set([...set].filter((id) => valid.has(id)));
  }
  return set;
}

/**
 * Drops ids that no longer exist from every set, clears a vanished selection,
 * sends a vanished focus back to the vault root, and, while "Expand folders" is
 * on, opens folders that did not exist before (`previousFolders`). Folders the
 * user closed by hand stay closed, because manual clicks win over the toggle.
 * Returns the same object when nothing needed to change, so an unrelated edit
 * does not re-render the dashboard.
 */
export function reconcileViewState(
  state: ViewState,
  valid: ReadonlySet<string>,
  allFolders: readonly string[],
  previousFolders: ReadonlySet<string>,
  rootUid: string,
): ViewState {
  let open = onlyValid(state.open, valid);
  if (state.foldersOn) {
    const created = allFolders.filter((uid) => !previousFolders.has(uid));
    if (created.length > 0) open = new Set([...open, ...created]);
  }
  const showAll = onlyValid(state.showAll, valid);
  const filesFor = onlyValid(state.filesFor, valid);
  const selected = state.selected !== null && valid.has(state.selected) ? state.selected : null;
  const focusRoot = valid.has(state.focusRoot) ? state.focusRoot : rootUid;

  if (
    open === state.open &&
    showAll === state.showAll &&
    filesFor === state.filesFor &&
    selected === state.selected &&
    focusRoot === state.focusRoot
  ) {
    return state;
  }
  return { ...state, open, showAll, filesFor, selected, focusRoot };
}
