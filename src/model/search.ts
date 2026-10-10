/**
 * Name search over the whole tree.
 *
 * Search never changes the saved view state. It produces a "reveal" overlay that
 * opens the folders leading to each match while the query is non-empty, and
 * clearing the query puts the view back as it was (a deliberate change from the
 * mockup, which left everything open). Implements SPEC.md section 4 rule 7.
 */
import { DEFAULT_LIST_LIMIT } from "./limits";
import type { TreeNode } from "./tree";
import type { Batches, VisibilityState } from "./visibility";

export interface SearchResult {
  /** Cards whose name matches. */
  hits: ReadonlySet<string>;
  /** Folders that lead to a match, up to the root. */
  ancestors: ReadonlySet<string>;
  /** Folders directly holding a match, whose files must be listed. */
  parents: ReadonlySet<string>;
  /**
   * For each folder on the way to a match, the batches of its children that hold a match or a
   * folder leading to one, so a search reveals those batches and nothing else.
   */
  batches: Batches;
}

/** Trims and lower-cases a query so matching ignores case and stray spaces. */
export function normaliseQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Finds matching names anywhere in the tree. Null means no search is active. */
export function searchTree(
  root: TreeNode,
  query: string,
  batchSize: number = DEFAULT_LIST_LIMIT,
): SearchResult | null {
  const needle = normaliseQuery(query);
  if (needle === "") return null;

  const hits = new Set<string>();
  const ancestors = new Set<string>();
  const parents = new Set<string>();
  const batches = new Map<string, Set<number>>();

  const mark = (folderUid: string, position: number): void => {
    const batch = Math.floor(position / batchSize);
    if (batch === 0) return;
    let set = batches.get(folderUid);
    if (!set) batches.set(folderUid, (set = new Set()));
    set.add(batch);
  };

  // `chain` is the way down to `node`: each folder and its position among its siblings.
  const chain: { node: TreeNode; position: number }[] = [];
  const walk = (node: TreeNode, position: number): void => {
    if (node.name.toLowerCase().includes(needle)) {
      hits.add(node.uid);
      if (node.parent) parents.add(node.parent.uid);
      for (let up = node.parent; up; up = up.parent) ancestors.add(up.uid);
      // The match and every folder above it sit in some batch of their parent.
      for (const link of chain) if (link.node.parent) mark(link.node.parent.uid, link.position);
      if (node.parent) mark(node.parent.uid, position);
    }
    chain.push({ node, position });
    node.children.forEach((child, index) => walk(child, index));
    chain.pop();
  };
  walk(root, 0);
  return { hits, ancestors, parents, batches };
}

function mergeBatches(a: Batches, b: Batches): Batches {
  const out = new Map<string, Set<number>>();
  for (const source of [a, b]) {
    for (const [uid, set] of source) {
      const merged = out.get(uid) ?? new Set<number>();
      for (const batch of set) merged.add(batch);
      out.set(uid, merged);
    }
  }
  return out;
}

/**
 * The visibility state with the search reveal applied: every folder leading to a
 * match is open, showing the batch of children that holds the match (and no others), and the
 * folders holding matches show their files. Returns the input unchanged when no search is active.
 */
export function withSearchReveal(
  state: VisibilityState,
  result: SearchResult | null,
): VisibilityState {
  if (!result) return state;
  return {
    ...state,
    open: new Set([...state.open, ...result.ancestors]),
    batches: mergeBatches(state.batches, result.batches),
    prefer: new Set([...result.hits, ...result.ancestors]),
    filesFor: new Set([...state.filesFor, ...result.parents]),
  };
}

/**
 * Whether a card should fade while a search is active: anything that is neither
 * a match nor on the way to one. Pills are never matches, so they fade.
 */
export function isDimmed(id: string, result: SearchResult | null): boolean {
  if (!result) return false;
  return !result.hits.has(id) && !result.ancestors.has(id);
}
