/**
 * The vault as a tree of nodes with stable ids.
 *
 * Pure on purpose: it takes a plain description of the vault (`RawEntry`) rather
 * than Obsidian's `TFolder`, so it can be unit tested without Obsidian and so
 * `vault.ts` is the only file that knows how to read the real vault.
 */

/** A file or folder as described by the vault adapter. A folder has `children`. */
export interface RawEntry {
  name: string;
  /** Vault-relative path. The root is "/". */
  path: string;
  children?: RawEntry[];
}

export interface TreeNode {
  /** Stable id. Used for open state, selection and element identity instead of the path. */
  uid: string;
  kind: "folder" | "file";
  name: string;
  path: string;
  parent: TreeNode | null;
  /** Subfolders first, then files, each group in natural name order. */
  children: TreeNode[];
}

/**
 * Hands out ids that stay the same for the same path across rebuilds.
 *
 * Why not use the path as the id: a path changes when a file moves, and a card
 * must keep its identity then so it can glide to its new parent instead of
 * vanishing and reappearing. Milestone 4 adds `moved` so renames keep their id.
 */
export class UidRegistry {
  private readonly byPath = new Map<string, string>();
  private next = 0;

  uidFor(path: string): string {
    let uid = this.byPath.get(path);
    if (uid === undefined) {
      uid = `n${this.next++}`;
      this.byPath.set(path, uid);
    }
    return uid;
  }

  /**
   * Records that a file or folder moved, so it keeps its id under the new path.
   * A folder takes everything beneath it along. Calling it again for a child that
   * has already moved does nothing, so it is safe whether Obsidian reports a
   * folder rename once or once for every file inside.
   */
  moved(oldPath: string, newPath: string): void {
    if (oldPath === newPath) return;
    const prefix = `${oldPath}/`;
    const renames: [string, string, string][] = [];
    for (const [path, uid] of this.byPath) {
      if (path === oldPath) renames.push([path, newPath, uid]);
      else if (path.startsWith(prefix)) renames.push([path, newPath + path.slice(oldPath.length), uid]);
    }
    for (const [from] of renames) this.byPath.delete(from);
    for (const [, to, uid] of renames) this.byPath.set(to, uid);
  }
}

/**
 * Orders siblings: folders before files, then names in natural order (so
 * "note 2" comes before "note 10") ignoring case. The vault API returns
 * children in no useful order, so the dashboard must sort for a stable layout.
 */
export function compareEntries(
  a: { name: string; children?: unknown },
  b: { name: string; children?: unknown },
): number {
  const aFolder = a.children !== undefined;
  const bFolder = b.children !== undefined;
  if (aFolder !== bFolder) return aFolder ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

/** Builds the node tree from a raw description, giving every node a stable uid. */
export function buildTree(raw: RawEntry, registry: UidRegistry): TreeNode {
  return buildNode(raw, null, registry);
}

function buildNode(raw: RawEntry, parent: TreeNode | null, registry: UidRegistry): TreeNode {
  const node: TreeNode = {
    uid: registry.uidFor(raw.path),
    kind: raw.children === undefined ? "file" : "folder",
    name: raw.name,
    path: raw.path,
    parent,
    children: [],
  };
  if (raw.children) {
    node.children = [...raw.children]
      .sort(compareEntries)
      .map((child) => buildNode(child, node, registry));
  }
  return node;
}

/** Maps every uid to its node, for looking up a card by the id the canvas reports. */
export function indexTree(root: TreeNode): Map<string, TreeNode> {
  const index = new Map<string, TreeNode>();
  const walk = (node: TreeNode): void => {
    index.set(node.uid, node);
    node.children.forEach(walk);
  };
  walk(root);
  return index;
}

/** The uid of every folder in the tree, for the "Expand folders" toggle. */
export function folderUids(root: TreeNode): string[] {
  const uids: string[] = [];
  const walk = (node: TreeNode): void => {
    if (node.kind !== "folder") return;
    uids.push(node.uid);
    node.children.forEach(walk);
  };
  walk(root);
  return uids;
}

/** The nodes from the root down to `node`, used to highlight the path back to the root. */
export function ancestry(node: TreeNode): TreeNode[] {
  const chain: TreeNode[] = [];
  for (let n: TreeNode | null = node; n; n = n.parent) chain.unshift(n);
  return chain;
}
