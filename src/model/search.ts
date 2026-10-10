/**
 * Name search over the whole tree.
 *
 * Search never changes the saved view state. It produces a "reveal" overlay that
 * opens the folders leading to each match while the query is non-empty, and
 * clearing the query puts the view back as it was (a deliberate change from the
 * mockup, which left everything open). Implements SPEC.md section 4 rule 7.
 */
import type { TreeNode } from "./tree";
import type { VisibilityState } from "./visibility";

export interface SearchResult {
  /** Cards whose name matches. */
  hits: ReadonlySet<string>;
  /** Folders that lead to a match, up to the root. */
  ancestors: ReadonlySet<string>;
  /** Folders directly holding a match, whose files must be listed. */
  parents: ReadonlySet<string>;
}

/** Trims and lower-cases a query so matching ignores case and stray spaces. */
export function normaliseQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Finds matching names anywhere in the tree. Null means no search is active. */
export function searchTree(root: TreeNode, query: string): SearchResult | null {
  const needle = normaliseQuery(query);
  if (needle === "") return null;

  const hits = new Set<string>();
  const ancestors = new Set<string>();
  const parents = new Set<string>();

  const walk = (node: TreeNode): void => {
    if (node.name.toLowerCase().includes(needle)) {
      hits.add(node.uid);
      if (node.parent) parents.add(node.parent.uid);
      for (let up = node.parent; up; up = up.parent) ancestors.add(up.uid);
    }
    node.children.forEach(walk);
  };
  walk(root);
  return { hits, ancestors, parents };
}

/**
 * The visibility state with the search reveal applied: every folder leading to a
 * match is open and fully listed, and the folders holding matches show their
 * files. Returns the input unchanged when no search is active.
 */
export function withSearchReveal(
  state: VisibilityState,
  result: SearchResult | null,
): VisibilityState {
  if (!result) return state;
  return {
    ...state,
    open: new Set([...state.open, ...result.ancestors]),
    showAll: new Set([...state.showAll, ...result.ancestors]),
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
