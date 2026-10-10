import { describe, expect, it } from "vitest";
import { isDimmed, normaliseQuery, searchTree, withSearchReveal } from "./search";
import { UidRegistry, buildTree, indexTree, type TreeNode } from "./tree";
import { FOLDER_CEILING } from "./limits";
import { buildVisibleTree, flattenVisible, type VisibilityState } from "./visibility";

const root = buildTree(
  {
    name: "Vault",
    path: "/",
    children: [
      {
        name: "Projects",
        path: "/Projects",
        children: [
          {
            name: "Plugin",
            path: "/Projects/Plugin",
            children: [{ name: "Roadmap.md", path: "/Projects/Plugin/Roadmap.md" }],
          },
          { name: "notes.md", path: "/Projects/notes.md" },
        ],
      },
      { name: "Daily", path: "/Daily", children: [{ name: "today.md", path: "/Daily/today.md" }] },
    ],
  },
  new UidRegistry(),
);

const byPath = (path: string): TreeNode => {
  const found = [...indexTree(root).values()].find((n) => n.path === path);
  if (!found) throw new Error(path);
  return found;
};

const base = (): VisibilityState => ({
  open: new Set([root.uid]),
  batches: new Map(),
  filesFor: new Set(),
  filesOn: false,
});

describe("normaliseQuery", () => {
  it("trims and lower-cases", () => {
    expect(normaliseQuery("  RoadMap ")).toBe("roadmap");
  });
});

describe("searchTree", () => {
  it("returns null for an empty or blank query", () => {
    expect(searchTree(root, "")).toBeNull();
    expect(searchTree(root, "   ")).toBeNull();
  });

  it("finds matches by name ignoring case, with their ancestors and parents", () => {
    const result = searchTree(root, "ROAD");
    const hit = byPath("/Projects/Plugin/Roadmap.md");
    expect([...(result?.hits ?? [])]).toEqual([hit.uid]);
    expect(result?.parents).toEqual(new Set([byPath("/Projects/Plugin").uid]));
    expect(result?.ancestors).toEqual(
      new Set([byPath("/Projects/Plugin").uid, byPath("/Projects").uid, root.uid]),
    );
  });

  it("matches folders as well as files", () => {
    expect(searchTree(root, "plug")?.hits.has(byPath("/Projects/Plugin").uid)).toBe(true);
  });

  it("returns empty sets when nothing matches", () => {
    const result = searchTree(root, "zzz");
    expect(result?.hits.size).toBe(0);
    expect(result?.ancestors.size).toBe(0);
  });
});

describe("searchTree batches", () => {
  const folderOf = (count: number): TreeNode =>
    buildTree(
      { name: "Vault", path: "/", children: Array.from({ length: count }, (_, i) => ({ name: `item ${String(i).padStart(3, "0")}`, path: `/item ${String(i).padStart(3, "0")}`, children: [] })) },
      new UidRegistry(),
    );

  it("marks no batch for a match in the first batch", () => {
    const tree = folderOf(100);
    expect(searchTree(tree, "item 005", 40)?.batches.size).toBe(0);
  });

  it("marks the batch of a match deeper in the list", () => {
    const tree = folderOf(100);
    const result = searchTree(tree, "item 085", 40);
    expect([...(result?.batches.get(tree.uid) ?? [])]).toEqual([2]);
  });

  it("marks the batches of a folder on the way to a match, level by level", () => {
    const tree = buildTree(
      {
        name: "Vault",
        path: "/",
        children: [
          ...Array.from({ length: 50 }, (_, i) => ({ name: `a${String(i).padStart(2, "0")}`, path: `/a${String(i).padStart(2, "0")}`, children: [] as never[] })),
          { name: "z", path: "/z", children: [{ name: "needle.md", path: "/z/needle.md" }] },
        ],
      },
      new UidRegistry(),
    );
    const result = searchTree(tree, "needle", 40);
    // "z" is the 51st folder, so it sits in batch 1 of the vault; the note is first inside "z".
    expect([...(result?.batches.get(tree.uid) ?? [])]).toEqual([1]);
    expect(result?.batches.size).toBe(1);
  });

  it("counts every match, however many there are", () => {
    const tree = folderOf(100);
    expect(searchTree(tree, "item", 40)?.hits.size).toBe(100);
  });
});

describe("withSearchReveal", () => {
  it("returns the same state when no search is active", () => {
    const state = base();
    expect(withSearchReveal(state, null)).toBe(state);
  });

  it("opens the path to a match and lists the files beside it", () => {
    const state = withSearchReveal(base(), searchTree(root, "roadmap"));
    const visible = flattenVisible(buildVisibleTree(root, state)).map((n) => n.node?.name);
    expect(visible).toContain("Plugin");
    expect(visible).toContain("Roadmap.md");
    expect(visible).not.toContain("today.md");
  });

  it("never hides a match in a folder too big to show in full", () => {
    const names = Array.from({ length: FOLDER_CEILING + 200 }, (_, i) => `note ${String(i + 1).padStart(5, "0")}.md`);
    const huge = buildTree(
      {
        name: "Vault",
        path: "/",
        children: [{ name: "Big", path: "/Big", children: names.map((name) => ({ name, path: `/Big/${name}` })) }],
      },
      new UidRegistry(),
    );
    // The last note sorts well past the ceiling, but it is the one being searched for.
    const target = names[names.length - 1] ?? "";
    const state = withSearchReveal(
      { open: new Set([huge.uid]), batches: new Map(), filesFor: new Set(), filesOn: true },
      searchTree(huge, target),
    );
    const visible = flattenVisible(buildVisibleTree(huge, state)).map((n) => n.node?.name);
    expect(visible).toContain(target);
  });

  it("reveals only the batch that holds the match, not the ones before it", () => {
    const names = Array.from({ length: 200 }, (_, i) => `note ${String(i + 1).padStart(3, "0")}.md`);
    const big = buildTree(
      {
        name: "Vault",
        path: "/",
        children: [{ name: "Big", path: "/Big", children: names.map((name) => ({ name, path: `/Big/${name}` })) }],
      },
      new UidRegistry(),
    );
    const target = "note 101.md"; // position 100: with batches of 40, batch 2 (positions 80 to 119)
    const result = searchTree(big, target, 40);
    const bigFolder = big.children[0];
    expect(bigFolder).toBeDefined();
    expect([...(result?.batches.get(bigFolder?.uid ?? "") ?? [])]).toEqual([2]);
    const state = withSearchReveal({ open: new Set([big.uid]), batches: new Map(), filesFor: new Set(), filesOn: true }, result);
    const shown = flattenVisible(buildVisibleTree(big, state, 40)).map((n) => n.node?.name);
    expect(shown).toContain(target);
    expect(shown).toContain("note 001.md"); // batch 0 is always there
    expect(shown).not.toContain("note 050.md"); // batch 1 stays hidden
    expect(shown).not.toContain("note 150.md"); // so does batch 3
  });

  it("does not change the original state", () => {
    const state = base();
    withSearchReveal(state, searchTree(root, "roadmap"));
    expect(state.open.size).toBe(1);
    expect(state.filesFor.size).toBe(0);
  });
});

describe("isDimmed", () => {
  it("never dims anything without a search", () => {
    expect(isDimmed("x", null)).toBe(false);
  });

  it("keeps matches and their ancestors bright and dims the rest", () => {
    const result = searchTree(root, "roadmap");
    expect(isDimmed(byPath("/Projects/Plugin/Roadmap.md").uid, result)).toBe(false);
    expect(isDimmed(byPath("/Projects").uid, result)).toBe(false);
    expect(isDimmed(byPath("/Daily").uid, result)).toBe(true);
    expect(isDimmed("more:whatever", result)).toBe(true);
  });
});
