import { describe, expect, it } from "vitest";
import { isDimmed, normaliseQuery, searchTree, withSearchReveal } from "./search";
import { UidRegistry, buildTree, indexTree, type TreeNode } from "./tree";
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
  showAll: new Set(),
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
