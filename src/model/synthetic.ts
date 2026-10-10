/**
 * Made-up vaults of any size, for the performance test and for measuring.
 *
 * Pure and deterministic (no randomness), so a slow run is the code's fault and not the data's.
 * The real vault is read by `vault.ts`; this stands in for it as a `RawEntry`.
 */
import type { RawEntry } from "./tree";

/** The names sort naturally (note 2 before note 10), as real ones do. */
function file(dir: string, index: number): RawEntry {
  const name = `note ${index + 1}.md`;
  return { name, path: dir === "/" ? name : `${dir}/${name}` };
}

function folder(parent: string, name: string, children: (path: string) => RawEntry[]): RawEntry {
  const path = parent === "/" ? name : `${parent}/${name}`;
  return { name, path, children: children(path) };
}

/** Counts the files in a raw tree. */
export function countRawFiles(entry: RawEntry): number {
  if (!entry.children) return 1;
  return entry.children.reduce((total, child) => total + countRawFiles(child), 0);
}

/**
 * A tidy vault: `top` folders, each with `sub` subfolders of `files` notes. The defaults make
 * exactly 10,000 files.
 */
export function balancedVault(top = 100, sub = 5, files = 20): RawEntry {
  return {
    name: "Vault",
    path: "/",
    children: Array.from({ length: top }, (_, t) =>
      folder("/", `Area ${t + 1}`, (areaPath) =>
        Array.from({ length: sub }, (_, s) =>
          folder(areaPath, `Topic ${s + 1}`, (topicPath) => Array.from({ length: files }, (_, f) => file(topicPath, f))),
        ),
      ),
    ),
  };
}

/** The worst case for one folder: every file in a single place. */
export function flatVault(files = 10_000): RawEntry {
  return {
    name: "Vault",
    path: "/",
    children: [folder("/", "Everything", (path) => Array.from({ length: files }, (_, f) => file(path, f)))],
  };
}

/** A vault that is mostly depth: a long chain of folders with a few notes at each level. */
export function deepVault(depth = 60, filesPerLevel = 5): RawEntry {
  const level = (parent: string, n: number): RawEntry[] => {
    const notes = Array.from({ length: filesPerLevel }, (_, f) => file(parent, f));
    if (n >= depth) return notes;
    return [...notes, folder(parent, `Level ${n + 1}`, (path) => level(path, n + 1))];
  };
  return { name: "Vault", path: "/", children: level("/", 0) };
}
