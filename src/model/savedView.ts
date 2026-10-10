/**
 * What the dashboard remembers about how it was left, so it comes back the same.
 *
 * Obsidian hands a view's saved state back when someone presses Back after opening a
 * note in the same tab, and again when the app restarts. The state is stored by path,
 * not by id, because ids are handed out afresh each session. Everything read back is
 * treated as untrusted (it sits in the workspace file and could be old or edited):
 * unknown values are dropped, never trusted, and a path that no longer exists is ignored.
 */
import type { LayoutMode } from "../layout/types";
import type { ViewState } from "./viewState";

/** The dashboard's saved state: plain JSON, with paths where the live state has ids. */
export interface SavedView {
  layoutMode: LayoutMode;
  detail: boolean;
  foldersOn: boolean;
  filesOn: boolean;
  /** Folders that are open. */
  open: string[];
  /** Per folder, the extra batches of children revealed by "+N more". */
  batches: Record<string, number[]>;
  /** Folders whose files show whatever the Expand files toggle says. */
  filesFor: string[];
  selected: string | null;
  /** The folder the view is focused on. */
  focusRoot: string;
  query: string;
}

/** A vault would need a very large number of open folders to reach this; it only bounds bad data. */
export const MAX_SAVED_PATHS = 5000;
const MAX_QUERY_LENGTH = 200;
const MAX_BATCHES_PER_FOLDER = 200;
const LAYOUTS: readonly string[] = ["vertical", "radial", "mindmap"];

function batchesToPaths(
  batches: ViewState["batches"],
  pathOf: (uid: string) => string | undefined,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  let count = 0;
  for (const [uid, set] of batches) {
    const path = pathOf(uid);
    if (path === undefined || set.size === 0 || count >= MAX_SAVED_PATHS) continue;
    out[path] = [...set].sort((a, b) => a - b).slice(0, MAX_BATCHES_PER_FOLDER);
    count += 1;
  }
  return out;
}

/** Reads saved batches back: only whole, non-negative numbers, and bounded. Anything else is ignored. */
function parseBatches(value: unknown): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) return out;
  let count = 0;
  for (const [path, list] of Object.entries(value)) {
    if (count >= MAX_SAVED_PATHS) break;
    if (!Array.isArray(list)) continue;
    const numbers = list.filter((n): n is number => Number.isInteger(n) && n > 0).slice(0, MAX_BATCHES_PER_FOLDER);
    if (numbers.length === 0) continue;
    out[path] = numbers;
    count += 1;
  }
  return out;
}

/** Turns the live state into the saved form. A card that has no path any more is left out. */
export function saveView(state: ViewState, pathOf: (uid: string) => string | undefined): SavedView {
  const paths = (uids: ReadonlySet<string>): string[] => {
    const out: string[] = [];
    for (const uid of uids) {
      const path = pathOf(uid);
      if (path !== undefined) out.push(path);
    }
    return out.slice(0, MAX_SAVED_PATHS);
  };
  return {
    layoutMode: state.layoutMode,
    detail: state.detail,
    foldersOn: state.foldersOn,
    filesOn: state.filesOn,
    open: paths(state.open),
    batches: batchesToPaths(state.batches, pathOf),
    filesFor: paths(state.filesFor),
    selected: state.selected === null ? null : (pathOf(state.selected) ?? null),
    focusRoot: pathOf(state.focusRoot) ?? "/",
    query: state.query,
  };
}

function strings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    out.push(item);
    if (out.length >= MAX_SAVED_PATHS) break;
  }
  return out;
}

/** Reads a saved state back, or returns null when it is missing or not a usable state. */
export function parseSavedView(raw: unknown): SavedView | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const open = strings(value.open);
  const filesFor = strings(value.filesFor);
  if (!open || !filesFor) return null;
  if (typeof value.layoutMode !== "string" || !LAYOUTS.includes(value.layoutMode)) return null;
  if (typeof value.detail !== "boolean" || typeof value.foldersOn !== "boolean" || typeof value.filesOn !== "boolean") {
    return null;
  }
  if (typeof value.focusRoot !== "string" || typeof value.query !== "string") return null;
  if (value.selected !== null && typeof value.selected !== "string") return null;
  return {
    layoutMode: value.layoutMode as LayoutMode,
    detail: value.detail,
    foldersOn: value.foldersOn,
    filesOn: value.filesOn,
    open,
    batches: parseBatches(value.batches),
    filesFor,
    selected: value.selected,
    focusRoot: value.focusRoot,
    query: value.query.slice(0, MAX_QUERY_LENGTH),
  };
}

function batchesFromPaths(
  saved: Record<string, number[]>,
  uidOf: (path: string) => string | undefined,
): ViewState["batches"] {
  const out = new Map<string, Set<number>>();
  for (const [path, list] of Object.entries(saved)) {
    const uid = uidOf(path);
    if (uid !== undefined) out.set(uid, new Set(list));
  }
  return out;
}

/**
 * Puts a saved state back on top of a starting state. Paths that no longer exist are dropped,
 * the vault root stays open, and a focus or selection that has gone falls back to the root and
 * to nothing. `uidOf` returns undefined for a path that is not in the tree.
 */
export function restoreView(
  saved: SavedView,
  uidOf: (path: string) => string | undefined,
  base: ViewState,
  rootUid: string,
): ViewState {
  const uids = (paths: readonly string[]): Set<string> => {
    const out = new Set<string>();
    for (const path of paths) {
      const uid = uidOf(path);
      if (uid !== undefined) out.add(uid);
    }
    return out;
  };
  const focus = uidOf(saved.focusRoot) ?? rootUid;
  const selected = saved.selected === null ? null : (uidOf(saved.selected) ?? null);
  return {
    ...base,
    layoutMode: saved.layoutMode,
    detail: saved.detail,
    foldersOn: saved.foldersOn,
    filesOn: saved.filesOn,
    open: uids(saved.open).add(rootUid).add(focus),
    batches: batchesFromPaths(saved.batches, uidOf),
    filesFor: uids(saved.filesFor),
    selected,
    focusRoot: focus,
    query: saved.query,
  };
}
