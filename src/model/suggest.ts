/**
 * What the search box suggests while you type, like Obsidian's quick switcher.
 *
 * It looks through the names in memory only, never at the cards, so it stays quick on a huge vault,
 * and it returns a handful of the best matches, best first. By default it lists folders only. With
 * files switched on, files are matched the same way as folders (a file's extension is ignored when that
 * helps) and a folder wins a tie. However many names match, only a handful are listed, and choosing one
 * loads that one card (see reveal.ts), so a loose word never turns into thousands of cards.
 */
import { normaliseQuery } from "./search";
import { ancestry, type TreeNode } from "./tree";

export interface Suggestion {
  uid: string;
  kind: "folder" | "file";
  name: string;
  /** Where it lives, as its folders from the vault down, for example "Vault / azure-docs / articles". */
  where: string;
  /** The parts of the name that matched, as [start, end) positions, for highlighting. */
  marks: [number, number][];
}

export interface Suggestions {
  /** The best matches, best first, at most `limit`. */
  items: Suggestion[];
  /** How many matched in all, which can be far more than are listed. */
  total: number;
}

export interface SuggestOptions {
  /** Also suggest files. */
  files: boolean;
  limit: number;
}

/** What kind of match it was, best first. Each class outranks everything below it. */
const EXACT = 5;
const PREFIX = 4;
const WORD = 3;
const CONTAINS = 2;
const LOOSE = 1;

/** Loose matching (letters in order, gaps allowed) needs at least this many letters, or it is only noise. */
const LOOSE_MIN_LETTERS = 3;
/** ...and the letters must sit within this many times their own count, so far-apart letters do not count. */
const LOOSE_SPREAD = 4;

const SEPARATOR = /[\s\-_./()[\]]/;

interface Found {
  node: TreeNode;
  rank: number;
  /** Lower is better inside a rank: a shorter name, and an earlier match. */
  cost: number;
  marks: [number, number][];
}

/** A name without its last extension: "plan.md" is "plan", ".hidden" stays. */
function withoutExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Merges single matched positions into runs. */
function runsOf(positions: readonly number[]): [number, number][] {
  const runs: [number, number][] = [];
  for (const position of positions) {
    const last = runs[runs.length - 1];
    if (last && last[1] === position) last[1] = position + 1;
    else runs.push([position, position + 1]);
  }
  return runs;
}

/** Scores one folder name against the query, or returns null when it does not match. */
function matchFolderName(name: string, needle: string): Omit<Found, "node"> | null {
  const hay = name.toLowerCase();
  if (hay === needle) return { rank: EXACT, cost: 0, marks: [[0, name.length]] };
  if (hay.startsWith(needle)) return { rank: PREFIX, cost: hay.length, marks: [[0, needle.length]] };

  // A match at the start of a later word: "ref" in "api-reference".
  for (let at = hay.indexOf(needle, 1); at !== -1; at = hay.indexOf(needle, at + 1)) {
    if (SEPARATOR.test(hay.charAt(at - 1))) {
      return { rank: WORD, cost: hay.length + at, marks: [[at, at + needle.length]] };
    }
  }
  const inside = hay.indexOf(needle);
  if (inside !== -1) return { rank: CONTAINS, cost: hay.length + inside, marks: [[inside, inside + needle.length]] };

  if (needle.length < LOOSE_MIN_LETTERS) return null;
  const positions: number[] = [];
  let from = 0;
  for (const letter of needle) {
    const at = hay.indexOf(letter, from);
    if (at === -1) return null;
    positions.push(at);
    from = at + 1;
  }
  const first = positions[0] ?? 0;
  const last = positions[positions.length - 1] ?? 0;
  if (last - first + 1 > needle.length * LOOSE_SPREAD) return null;
  return { rank: LOOSE, cost: hay.length + first, marks: runsOf(positions) };
}

/**
 * Scores a file name like a folder name, except that "plan" is an exact match for "plan.md": the name
 * is also tried without its extension, and kept if that matches better.
 */
function matchFileName(name: string, needle: string): Omit<Found, "node"> | null {
  const direct = matchFolderName(name, needle);
  const stem = withoutExtension(name);
  if (stem === name) return direct;
  const bare = matchFolderName(stem, needle);
  return bare && (!direct || bare.rank > direct.rank) ? bare : direct;
}

/** Scores a path query: the whole path, with or without a file's extension, is exact; a part of it is a looser match. */
function matchPath(node: TreeNode, wanted: string): Omit<Found, "node"> | null {
  const path = node.path.toLowerCase().replace(/^\//, "");
  const at = path.indexOf(wanted);
  if (at === -1) return null;
  if (path === wanted || (node.kind === "file" && withoutExtension(path) === wanted)) {
    return { rank: EXACT, cost: 0, marks: [[0, node.name.length]] };
  }
  return { rank: CONTAINS, cost: path.length + at, marks: [] };
}

/** How deep a node sits, counted from its path. */
function depthOf(node: TreeNode): number {
  let depth = 0;
  for (let at = node.path.indexOf("/"); at !== -1; at = node.path.indexOf("/", at + 1)) depth += 1;
  return depth;
}

/**
 * The best matches for what is typed. Nothing is suggested for an empty query. A query with a
 * slash is read as part of a path: it finds the folders (and, with files on, files) whose path
 * contains it.
 */
export function suggest(root: TreeNode, query: string, options: SuggestOptions): Suggestions {
  const needle = normaliseQuery(query);
  if (needle === "") return { items: [], total: 0 };
  const byPath = needle.includes("/");
  const wanted = needle.replace(/^\//, "");

  const found: Found[] = [];
  const visit = (node: TreeNode): void => {
    for (const child of node.children) {
      if (child.kind === "folder") {
        const match = byPath ? matchPath(child, wanted) : matchFolderName(child.name, needle);
        if (match) found.push({ node: child, ...match });
        visit(child);
      } else if (options.files) {
        const match = byPath ? matchPath(child, wanted) : matchFileName(child.name, needle);
        if (match) found.push({ node: child, ...match });
      }
    }
  };
  visit(root);

  found.sort(
    (a, b) =>
      b.rank - a.rank ||
      a.cost - b.cost ||
      Number(a.node.kind === "file") - Number(b.node.kind === "file") ||
      depthOf(a.node) - depthOf(b.node) ||
      a.node.path.localeCompare(b.node.path, "en-GB", { numeric: true }),
  );

  const items = found.slice(0, Math.max(0, options.limit)).map<Suggestion>(({ node, marks }) => ({
    uid: node.uid,
    kind: node.kind,
    name: node.name,
    where: ancestry(node)
      .slice(0, -1)
      .map((link) => link.name)
      .join(" / "),
    marks,
  }));
  return { items, total: found.length };
}
