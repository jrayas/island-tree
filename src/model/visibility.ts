/**
 * Decides which cards are on the canvas.
 *
 * Implements the visibility rules from SPEC.md section 4 (rules 1 to 3): a folder
 * shows children only when open, subfolders come first and files only when
 * allowed, and long lists collapse into a "+N more" pill. The output is a
 * separate tree of visible items, so layout and rendering never need to know the
 * rules.
 */
import type { TreeNode } from "./tree";

/** Default number of children shown before the rest collapse into "+N more". */
export const DEFAULT_LIMIT = 6;

/** The parts of the view state that decide visibility. */
export interface VisibilityState {
  /** Folders whose children are shown. */
  open: ReadonlySet<string>;
  /** Folders whose overflow ("+N more") has been expanded. */
  showAll: ReadonlySet<string>;
  /** Folders whose files are shown even when files are off globally. */
  filesFor: ReadonlySet<string>;
  /** Global "Expand files" toggle. */
  filesOn: boolean;
}

export interface VisibleNode {
  /** Node uid, or `more:<folder uid>` for a "+N more" pill. */
  id: string;
  kind: "folder" | "file" | "more";
  /** The vault node. Null for "+N more" pills, which are never stored in the vault. */
  node: TreeNode | null;
  /** For a pill, how many children it hides. Otherwise 0. */
  hidden: number;
  parentId: string | null;
  children: VisibleNode[];
}

export function moreId(folderUid: string): string {
  return `more:${folderUid}`;
}

/** Whether a folder's files are listed, either globally or for this folder only. */
export function filesVisible(state: VisibilityState, folderUid: string): boolean {
  return state.filesOn || state.filesFor.has(folderUid);
}

/**
 * The children a folder shows right now: nothing when closed, subfolders first,
 * files only when allowed, and a pill in place of the overflow. `TreeNode.children`
 * is already sorted folders first, so filtering keeps that order.
 */
export function visibleChildren(
  folder: TreeNode,
  state: VisibilityState,
  limit: number = DEFAULT_LIMIT,
): VisibleNode[] {
  if (folder.kind !== "folder" || !state.open.has(folder.uid)) return [];

  const listed = filesVisible(state, folder.uid)
    ? folder.children
    : folder.children.filter((child) => child.kind === "folder");

  const shown = listed.length > limit && !state.showAll.has(folder.uid) ? listed.slice(0, limit) : listed;
  const items = shown.map<VisibleNode>((node) => ({
    id: node.uid,
    kind: node.kind,
    node,
    hidden: 0,
    parentId: folder.uid,
    children: [],
  }));

  if (shown.length < listed.length) {
    items.push({
      id: moreId(folder.uid),
      kind: "more",
      node: null,
      hidden: listed.length - shown.length,
      parentId: folder.uid,
      children: [],
    });
  }
  return items;
}

/** Builds the whole visible tree below `root`, applying the rules at every level. */
export function buildVisibleTree(
  root: TreeNode,
  state: VisibilityState,
  limit: number = DEFAULT_LIMIT,
): VisibleNode {
  const build = (item: VisibleNode): VisibleNode => {
    if (item.node) {
      item.children = visibleChildren(item.node, state, limit).map(build);
    }
    return item;
  };
  return build({
    id: root.uid,
    kind: root.kind,
    node: root,
    hidden: 0,
    parentId: null,
    children: [],
  });
}

/** Lists the visible tree parents first, which is the order animation seeding needs. */
export function flattenVisible(root: VisibleNode): VisibleNode[] {
  const out: VisibleNode[] = [];
  const walk = (item: VisibleNode): void => {
    out.push(item);
    item.children.forEach(walk);
  };
  walk(root);
  return out;
}
