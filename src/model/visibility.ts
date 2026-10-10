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
  /**
   * Cards that matter right now (search matches and the folders leading to them). A folder with
   * more children than can be shown shows these first, so a search never hides its own results.
   */
  prefer?: ReadonlySet<string>;
}

/**
 * The most children one folder shows at once, even when expanded. Drawing and animating thousands
 * of cards at once freezes the dashboard (measured: 10,000 cards took over 5 seconds to appear and
 * panned at 8 frames per second, while 500 stays at 60), so the rest are summarised by a pill and
 * found by searching.
 */
export const EXPANDED_CAP = 500;

/**
 * Picks at most `cap` of `items`, keeping their order. Items in `prefer` are taken first, then
 * the rest in order, so what matters is never the part that is cut off.
 */
export function pickWithin<T extends { uid: string }>(
  items: readonly T[],
  cap: number,
  prefer?: ReadonlySet<string>,
): T[] {
  if (items.length <= cap) return [...items];
  if (!prefer || prefer.size === 0) return items.slice(0, cap);
  const chosen = new Set<T>();
  for (const item of items) {
    if (chosen.size >= cap) break;
    if (prefer.has(item.uid)) chosen.add(item);
  }
  for (const item of items) {
    if (chosen.size >= cap) break;
    chosen.add(item);
  }
  return items.filter((item) => chosen.has(item));
}

export interface VisibleNode {
  /** Node uid, or `more:<folder uid>` for a "+N more" pill. */
  id: string;
  kind: "folder" | "file" | "more";
  /** The vault node. Null for "+N more" pills, which are never stored in the vault. */
  node: TreeNode | null;
  /** For a pill, how many children it hides. Otherwise 0. */
  hidden: number;
  /** For a pill: the folder is already fully expanded and still has more than can be shown. */
  capped?: boolean;
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

  const expanded = state.showAll.has(folder.uid);
  const shown = expanded
    ? pickWithin(listed, EXPANDED_CAP, state.prefer)
    : listed.length > limit
      ? listed.slice(0, limit)
      : listed;
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
      capped: expanded,
      parentId: folder.uid,
      children: [],
    });
  }
  return items;
}

/**
 * The most cards the whole dashboard draws at once, whatever is open. A search that matches
 * thousands of names, or every folder expanded in a huge vault, would otherwise ask for tens of
 * thousands (measured: 10,600 cards froze the dashboard for 8 seconds). 1,000 stays smooth.
 */
export const MAX_CARDS = 1000;

/** How many cards one pill's worth of children stands for: a dropped pill counts its own hidden items. */
function weight(item: VisibleNode): number {
  return item.kind === "more" ? item.hidden : 1;
}

/**
 * Builds the whole visible tree below `root`, applying the rules at every level. It fills the
 * tree level by level and stops at `budget` cards, so the top of the tree always shows and only
 * the deepest levels are cut. Wherever children are left out, a pill says how many.
 */
export function buildVisibleTree(
  root: TreeNode,
  state: VisibilityState,
  limit: number = DEFAULT_LIMIT,
  budget: number = MAX_CARDS,
): VisibleNode {
  const top: VisibleNode = {
    id: root.uid,
    kind: root.kind,
    node: root,
    hidden: 0,
    parentId: null,
    children: [],
  };
  let used = 1;
  const queue: VisibleNode[] = [top];
  for (let head = 0; head < queue.length; head++) {
    const item = queue[head];
    if (!item?.node) continue;
    const wanted = visibleChildren(item.node, state, limit);
    if (wanted.length === 0) continue;
    const room = budget - used;
    const real = wanted.filter((child) => child.kind !== "more");
    if (real.length <= room) {
      item.children = wanted;
    } else {
      // Keep what fits. Pills are not counted, so one can always say what is left out.
      const kept = real.slice(0, Math.max(0, room));
      const dropped = wanted
        .filter((child) => !kept.includes(child))
        .reduce((total, child) => total + weight(child), 0);
      item.children = [
        ...kept,
        {
          id: moreId(item.node.uid),
          kind: "more",
          node: null,
          hidden: dropped,
          capped: true,
          parentId: item.node.uid,
          children: [],
        },
      ];
    }
    used += item.children.filter((child) => child.kind !== "more").length;
    for (const child of item.children) if (child.node) queue.push(child);
  }
  return top;
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
