/**
 * What the search box suggests while you type, like Obsidian's quick switcher.
 *
 * It looks through the names in memory only, never at the cards, so it stays quick on a huge vault,
 * and it returns a handful of the best matches, best first. By default it lists folders only. With
 * files switched on, a file is suggested only when its whole name matches (with or without its
 * extension), so a loose word never turns into thousands of files. Choosing a suggestion loads that
 * one card (see reveal.ts).
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
  /** Also suggest files, by exact name only. */
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

/** A file matches only by its whole name, with or without the extension, or by its whole path. */
function matchFileName(node: TreeNode, needle: string): Omit<Found, "node"> | null {
  const hay = node.name.toLowerCase();
  const path = node.path.toLowerCase().replace(/^\//, "");
  const whole = needle.includes("/") ? [path, withoutExtension(path)] : [hay, withoutExtension(hay)];
  const wanted = needle.replace(/^\//, "");
  if (!whole.includes(wanted)) return null;
  return { rank: EXACT, cost: 0, marks: [[0, node.name.length]] };
}

/** How deep a node sits, counted from its path. */
function depthOf(node: TreeNode): number {
  let depth = 0;
  for (let at = node.path.indexOf("/"); at !== -1; at = node.path.indexOf("/", at + 1)) depth += 1;
  return depth;
}

/**
 * The best matches for what is typed. Nothing is suggested for an empty query. A query with a
 * slash is read as part of a path: it finds folders whose path contains it, and files by their
 * whole path.
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
        let match: Omit<Found, "node"> | null;
        if (byPath) {
          const path = child.path.toLowerCase().replace(/^\//, "");
          const at = path.indexOf(wanted);
          match =
            at === -1
              ? null
              : path === wanted
                ? { rank: EXACT, cost: 0, marks: [[0, child.name.length]] }
                : { rank: CONTAINS, cost: path.length + at, marks: [] };
        } else {
          match = matchFolderName(child.name, needle);
        }
        if (match) found.push({ node: child, ...match });
        visit(child);
      } else if (options.files) {
        const match = matchFileName(child, needle);
        if (match) found.push({ node: child, ...match });
      }
    }
  };
  visit(root);

  found.sort(
    (a, b) =>
      b.rank - a.rank ||
      a.cost - b.cost ||
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
