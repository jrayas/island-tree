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

function onlyValidBatches(batches: ViewState["batches"], valid: ReadonlySet<string>): ViewState["batches"] {
  for (const uid of batches.keys()) {
    if (!valid.has(uid)) return new Map([...batches].filter(([id]) => valid.has(id)));
  }
  return batches;
}

/**
 * Drops ids that no longer exist from every set, clears a vanished selection and sends a
 * vanished focus back to the vault root. New folders stay closed, even while "Expand folders" is
 * on: opening them would build cards nobody asked for, which a pasted folder of thousands would
 * turn into a freeze. Returns the same object when nothing needed to change, so an unrelated
 * edit does not re-render the dashboard.
 */
export function reconcileViewState(state: ViewState, valid: ReadonlySet<string>, rootUid: string): ViewState {
  const open = onlyValid(state.open, valid);
  const batches = onlyValidBatches(state.batches, valid);
  const filesFor = onlyValid(state.filesFor, valid);
  const pinned = onlyValid(state.pinned, valid);
  const selected = state.selected !== null && valid.has(state.selected) ? state.selected : null;
  const focusRoot = valid.has(state.focusRoot) ? state.focusRoot : rootUid;

  if (
    open === state.open &&
    batches === state.batches &&
    filesFor === state.filesFor &&
    pinned === state.pinned &&
    selected === state.selected &&
    focusRoot === state.focusRoot
  ) {
    return state;
  }
  return { ...state, open, batches, filesFor, pinned, selected, focusRoot, filesOn: focusRoot === state.focusRoot ? state.filesOn : false };
}
