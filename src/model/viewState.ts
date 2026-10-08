/**
 * What the user has opened, expanded and selected.
 *
 * Kept apart from the vault tree (SPEC.md section 4): the tree describes the
 * vault, this describes the dashboard. Every change is a pure function returning
 * a new state, which suits Svelte's reactivity and makes undo and tests simple.
 * Milestone 3 adds focus, search and the Expand toggles on top of this.
 */
import type { VisibilityState } from "./visibility";

export interface ViewState extends VisibilityState {
  /** Uid of the selected card, or null. */
  selected: string | null;
}

/** The starting state: only the root is open, so its subfolders are listed. */
export function createViewState(rootUid: string): ViewState {
  return {
    open: new Set([rootUid]),
    showAll: new Set(),
    filesFor: new Set(),
    filesOn: false,
    selected: null,
  };
}

function toggled(set: ReadonlySet<string>, uid: string): Set<string> {
  const next = new Set(set);
  if (!next.delete(uid)) next.add(uid);
  return next;
}

/** Opens a closed folder or closes an open one. */
export function toggleOpen(state: ViewState, uid: string): ViewState {
  return { ...state, open: toggled(state.open, uid) };
}

/**
 * Shows or hides the files of one folder, opening the folder so the change is
 * visible. A manual click always wins over the global toggle (rule 6).
 */
export function toggleFilesFor(state: ViewState, uid: string): ViewState {
  return {
    ...state,
    open: new Set(state.open).add(uid),
    filesFor: toggled(state.filesFor, uid),
  };
}

/** Expands a folder's "+N more" pill so all of its children show. */
export function showAllFor(state: ViewState, uid: string): ViewState {
  return { ...state, showAll: new Set(state.showAll).add(uid) };
}

export function select(state: ViewState, uid: string | null): ViewState {
  return state.selected === uid ? state : { ...state, selected: uid };
}
