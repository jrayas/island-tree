/**
 * What the user has opened, expanded, selected, searched for and focused on.
 *
 * Kept apart from the vault tree (SPEC.md section 4): the tree describes the
 * vault, this describes the dashboard. Every change is a pure function returning
 * a new state, which suits Svelte's reactivity and makes the rules easy to test.
 */
import type { LayoutMode } from "../layout/types";
import type { VisibilityState } from "./visibility";

export interface ViewState extends VisibilityState {
  /** Uid of the selected card, or null. */
  selected: string | null;
  /** The "Expand folders" toggle. Only drives the button; `open` holds the real state. */
  foldersOn: boolean;
  /** Uid of the folder the dashboard is focused on. The vault root when not focused. */
  focusRoot: string;
  /** The search text as typed. */
  query: string;
  layoutMode: LayoutMode;
}

/** The starting state: only the root is open, so its subfolders are listed. */
export function createViewState(rootUid: string, layoutMode: LayoutMode = "vertical"): ViewState {
  return {
    open: new Set([rootUid]),
    showAll: new Set(),
    filesFor: new Set(),
    filesOn: false,
    selected: null,
    foldersOn: false,
    focusRoot: rootUid,
    query: "",
    layoutMode,
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

/**
 * "Expand folders" (rule 4). On opens every folder. Off closes everything back to
 * the root and resets the focus, because a focus deep in a tree that has just
 * collapsed would otherwise leave the view stranded.
 */
export function setFoldersOn(
  state: ViewState,
  on: boolean,
  allFolders: readonly string[],
  rootUid: string,
): ViewState {
  if (on) return { ...state, foldersOn: true, open: new Set(allFolders) };
  return { ...state, foldersOn: false, open: new Set([rootUid]), focusRoot: rootUid };
}

/**
 * "Expand files" (rule 5). On lists the files of every open folder. Off hides
 * them again and forgets the per-folder choices.
 */
export function setFilesOn(state: ViewState, on: boolean): ViewState {
  if (on) return { ...state, filesOn: true };
  return { ...state, filesOn: false, filesFor: new Set() };
}

/** Focuses on a folder, opening it so its children show. */
export function focusOn(state: ViewState, uid: string): ViewState {
  return { ...state, focusRoot: uid, open: new Set(state.open).add(uid) };
}

export function resetFocus(state: ViewState, rootUid: string): ViewState {
  return state.focusRoot === rootUid ? state : { ...state, focusRoot: rootUid };
}

/**
 * Sets the search text. A non-empty search shows matches from the whole vault, so
 * it also leaves any focus, as the mockup does.
 */
export function setQuery(state: ViewState, query: string, rootUid: string): ViewState {
  const next = { ...state, query };
  return query.trim() === "" ? next : { ...next, focusRoot: rootUid };
}

export function setLayout(state: ViewState, layoutMode: LayoutMode): ViewState {
  return state.layoutMode === layoutMode ? state : { ...state, layoutMode };
}

/** The "Reset" button: back to the starting view, keeping the chosen layout. */
export function resetView(state: ViewState, rootUid: string): ViewState {
  return createViewState(rootUid, state.layoutMode);
}
