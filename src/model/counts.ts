/**
 * A cache of folder and file counts, keyed by folder path.
 *
 * Each folder keeps its direct counts (what its badge shows) and, once the whole vault has been
 * counted, the totals beneath it (how many folders and files it holds in all). The first draw never
 * waits for it: direct counts come straight from the folder, and the totals are filled in by a
 * build that runs in slices and gives the browser a turn between them. After that a change only
 * recounts the folders on the way up from where it happened, never the whole vault. Pure, so all
 * of it can be tested without Obsidian.
 */
import { ROOT_PATH, parentOf } from "../editing/rules";
import type { TreeNode } from "./tree";

export interface FolderCounts {
  /** Subfolders directly inside. */
  folders: number;
  /** Files directly inside. */
  files: number;
  /** Everything beneath, or null until the whole-vault count has reached this folder. */
  total: { folders: number; files: number } | null;
}

/** Looks up a node by its path. The tree is rebuilt on every change, so this is built with it. */
export function indexByPath(root: TreeNode): Map<string, TreeNode> {
  const index = new Map<string, TreeNode>();
  const stack: TreeNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    index.set(node.path, node);
    for (const child of node.children) stack.push(child);
  }
  return index;
}

function depthOf(path: string): number {
  return path === ROOT_PATH ? 0 : path.split("/").length;
}

export interface BuildOptions {
  /** How many folders to count before giving the browser a turn. */
  chunk: number;
  /** Waits for the browser to have a turn. */
  yieldNow: () => Promise<void>;
  /** Asked after every turn: true abandons the build (the tree it was counting has been replaced). */
  shouldStop?: () => boolean;
}

export class CountCache {
  private readonly entries = new Map<string, FolderCounts>();
  private done = false;

  /** True once every folder has its totals. Until then the totals read as unknown. */
  get ready(): boolean {
    return this.done;
  }

  get size(): number {
    return this.entries.size;
  }

  get(path: string): FolderCounts | undefined {
    return this.entries.get(path);
  }

  /** Forgets everything, for when the whole vault is about to be counted again. */
  clear(): void {
    this.entries.clear();
    this.done = false;
  }

  /**
   * The counts for a folder. A folder that is not in the cache yet is counted once, from its own
   * children, and stored; its totals stay unknown until the build or a change fills them in.
   */
  countsFor(folder: TreeNode): FolderCounts {
    const hit = this.entries.get(folder.path);
    if (hit) return hit;
    const folders = folder.children.filter((child) => child.kind === "folder").length;
    const made: FolderCounts = { folders, files: folder.children.length - folders, total: null };
    this.entries.set(folder.path, made);
    return made;
  }

  /** A folder's entry worked out from its children's, which must already be complete. */
  private fromChildren(folder: TreeNode): FolderCounts {
    let folders = 0;
    let totalFolders = 0;
    let totalFiles = 0;
    for (const child of folder.children) {
      if (child.kind === "folder") {
        folders += 1;
        const below = this.entries.get(child.path)?.total;
        totalFolders += 1 + (below?.folders ?? 0);
        totalFiles += below?.files ?? 0;
      }
    }
    const files = folder.children.length - folders;
    return { folders, files, total: { folders: totalFolders, files: totalFiles + files } };
  }

  /** Counts a whole subtree, children before parents, storing every folder in it. */
  private fill(top: TreeNode): void {
    const order: TreeNode[] = [];
    const stack: TreeNode[] = [top];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) break;
      order.push(node);
      for (const child of node.children) if (child.kind === "folder") stack.push(child);
    }
    for (let i = order.length - 1; i >= 0; i--) {
      const node = order[i];
      if (node) this.entries.set(node.path, this.fromChildren(node));
    }
  }

  /** Makes sure a folder and everything beneath it has totals, counting it now if it does not. */
  private ensureFull(folder: TreeNode): void {
    if (this.entries.get(folder.path)?.total) return;
    this.fill(folder);
  }

  /**
   * Counts the whole vault in slices, so the first draw is never held up. Returns true when it
   * finished and false when `shouldStop` abandoned it.
   */
  async build(root: TreeNode, options: BuildOptions): Promise<boolean> {
    this.clear();
    const stack: { node: TreeNode; expanded: boolean }[] = [{ node: root, expanded: false }];
    let counted = 0;
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (!top) break;
      if (!top.expanded) {
        top.expanded = true;
        for (const child of top.node.children) if (child.kind === "folder") stack.push({ node: child, expanded: false });
        continue;
      }
      stack.pop();
      this.entries.set(top.node.path, this.fromChildren(top.node));
      counted += 1;
      if (counted % options.chunk === 0) {
        await options.yieldNow();
        if (options.shouldStop?.()) return false;
      }
    }
    this.done = true;
    return true;
  }

  /**
   * Brings the counts up to date after a change, touching only what it affected. `changed` holds
   * every path that was created, deleted, or renamed or moved (both the old and the new path, so
   * both parent chains are updated). Folders that no longer exist are forgotten, a new or moved
   * folder is counted along with everything in it, and each folder on the way up from a change
   * is recounted from its children, deepest first.
   */
  applyChanges(index: ReadonlyMap<string, TreeNode>, changed: readonly string[]): void {
    for (const path of [...this.entries.keys()]) {
      if (index.get(path)?.kind !== "folder") this.entries.delete(path);
    }
    const touched = new Set<string>();
    for (const path of changed) {
      const node = index.get(path);
      if (node?.kind === "folder") this.ensureFull(node);
      for (let up = parentOf(path); ; up = parentOf(up)) {
        if (index.get(up)?.kind === "folder") touched.add(up);
        if (up === ROOT_PATH) break;
      }
    }
    const ordered = [...touched].sort((a, b) => depthOf(b) - depthOf(a));
    for (const path of ordered) {
      const folder = index.get(path);
      if (!folder) continue;
      for (const child of folder.children) if (child.kind === "folder") this.ensureFull(child);
      this.entries.set(path, this.fromChildren(folder));
    }
  }
}
