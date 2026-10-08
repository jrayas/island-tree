import { describe, expect, it } from "vitest";
import { UidRegistry, buildTree, indexTree, type RawEntry, type TreeNode } from "./tree";
import {
  buildVisibleTree,
  filesVisible,
  flattenVisible,
  moreId,
  visibleChildren,
  type VisibilityState,
} from "./visibility";

const file = (name: string, dir: string): RawEntry => ({ name, path: `${dir}/${name}` });
const folder = (name: string, dir: string, children: RawEntry[]): RawEntry => ({
  name,
  path: `${dir}/${name}`,
  children,
});

function state(
  partial: Partial<Omit<VisibilityState, "open">> & { open?: string[] } = {},
): VisibilityState {
  return {
    open: new Set(partial.open ?? []),
    showAll: partial.showAll ?? new Set(),
    filesFor: partial.filesFor ?? new Set(),
    filesOn: partial.filesOn ?? false,
  };
}

function setup(): { root: TreeNode; byPath: (path: string) => TreeNode } {
  const root = buildTree(
    {
      name: "Vault",
      path: "/",
      children: [
        folder("A", "", [file("a1.md", "/A"), folder("Deep", "/A", [file("d.md", "/A/Deep")])]),
        folder("B", "", []),
        file("root.md", ""),
      ],
    },
    new UidRegistry(),
  );
  const index = indexTree(root);
  const byPath = (path: string): TreeNode => {
    const found = [...index.values()].find((n) => n.path === path);
    if (!found) throw new Error(`missing ${path}`);
    return found;
  };
  return { root, byPath };
}

describe("visibleChildren", () => {
  it("shows nothing for a closed folder", () => {
    const { root } = setup();
    expect(visibleChildren(root, state())).toEqual([]);
  });

  it("shows only subfolders when files are off", () => {
    const { root } = setup();
    const kids = visibleChildren(root, state({ open: [root.uid] }));
    expect(kids.map((k) => k.node?.name)).toEqual(["A", "B"]);
  });

  it("lists files after subfolders when files are on globally", () => {
    const { root } = setup();
    const kids = visibleChildren(root, state({ open: [root.uid], filesOn: true }));
    expect(kids.map((k) => k.node?.name)).toEqual(["A", "B", "root.md"]);
  });

  it("lists files for a single folder through filesFor", () => {
    const { root, byPath } = setup();
    const a = byPath("/A");
    const s = state({ open: [root.uid, a.uid], filesFor: new Set([a.uid]) });
    expect(visibleChildren(a, s).map((k) => k.node?.name)).toEqual(["Deep", "a1.md"]);
    expect(visibleChildren(root, s).map((k) => k.node?.name)).toEqual(["A", "B"]);
  });

  it("collapses overflow into a pill with the hidden count", () => {
    const many = buildTree(
      {
        name: "Vault",
        path: "/",
        children: Array.from({ length: 9 }, (_, i) => folder(`f${i}`, "", [])),
      },
      new UidRegistry(),
    );
    const kids = visibleChildren(many, state({ open: [many.uid] }), 6);
    expect(kids).toHaveLength(7);
    const pill = kids[6];
    expect(pill?.kind).toBe("more");
    expect(pill?.hidden).toBe(3);
    expect(pill?.id).toBe(moreId(many.uid));
    expect(pill?.node).toBeNull();
  });

  it("shows every child once the folder is in showAll", () => {
    const many = buildTree(
      {
        name: "Vault",
        path: "/",
        children: Array.from({ length: 9 }, (_, i) => folder(`f${i}`, "", [])),
      },
      new UidRegistry(),
    );
    const kids = visibleChildren(many, state({ open: [many.uid], showAll: new Set([many.uid]) }), 6);
    expect(kids).toHaveLength(9);
    expect(kids.some((k) => k.kind === "more")).toBe(false);
  });

  it("does not add a pill when the list fits the limit exactly", () => {
    const six = buildTree(
      {
        name: "Vault",
        path: "/",
        children: Array.from({ length: 6 }, (_, i) => folder(`f${i}`, "", [])),
      },
      new UidRegistry(),
    );
    expect(visibleChildren(six, state({ open: [six.uid] }), 6)).toHaveLength(6);
  });

  it("returns nothing for a file", () => {
    const { byPath } = setup();
    const f = byPath("/root.md");
    expect(visibleChildren(f, state({ open: [f.uid] }))).toEqual([]);
  });
});

describe("filesVisible", () => {
  it("is true globally or per folder", () => {
    expect(filesVisible(state({ filesOn: true }), "x")).toBe(true);
    expect(filesVisible(state({ filesFor: new Set(["x"]) }), "x")).toBe(true);
    expect(filesVisible(state(), "x")).toBe(false);
  });
});

describe("buildVisibleTree and flattenVisible", () => {
  it("only descends into open folders and lists parents before children", () => {
    const { root, byPath } = setup();
    const a = byPath("/A");
    const tree = buildVisibleTree(root, state({ open: [root.uid, a.uid] }));
    const flat = flattenVisible(tree);
    expect(flat.map((n) => n.node?.name)).toEqual(["Vault", "A", "Deep", "B"]);
    expect(tree.parentId).toBeNull();
    expect(flat.find((n) => n.node?.name === "Deep")?.parentId).toBe(a.uid);
  });
});
