import { describe, expect, it } from "vitest";
import { UidRegistry, buildTree, indexTree, type RawEntry, type TreeNode } from "./tree";
import { FOLDER_CEILING } from "./limits";
import {
  buildVisibleTree,
  filesVisible,
  flattenVisible,
  moreId,
  nextBatchFor,
  pickWithin,
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
    batches: partial.batches ?? new Map(),
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

  const nFolders = (count: number): TreeNode =>
    buildTree(
      { name: "Vault", path: "/", children: Array.from({ length: count }, (_, i) => folder(`f${String(i).padStart(4, "0")}`, "", [])) },
      new UidRegistry(),
    );
  const names = (items: { node: TreeNode | null }[]): string[] => items.filter((i) => i.node).map((i) => i.node?.name ?? "");

  it("reveals the next batch when its number is in batches", () => {
    const many = nFolders(20);
    const first = visibleChildren(many, state({ open: [many.uid] }), 6);
    expect(first).toHaveLength(7);
    const withOne = visibleChildren(many, state({ open: [many.uid], batches: new Map([[many.uid, new Set([1])]]) }), 6);
    expect(names(withOne)).toEqual(Array.from({ length: 12 }, (_, i) => `f${String(i).padStart(4, "0")}`));
    expect(withOne[withOne.length - 1]?.hidden).toBe(8);
    expect(withOne[withOne.length - 1]?.capped).toBe(false);
  });

  it("shows only the batches asked for, in their original order", () => {
    const many = nFolders(30);
    const kids = visibleChildren(many, state({ open: [many.uid], batches: new Map([[many.uid, new Set([3])]]) }), 6);
    // Batch 0 (f0..f5) and batch 3 (f18..f23), then a pill for the other 18.
    expect(names(kids)).toEqual(["f0000", "f0001", "f0002", "f0003", "f0004", "f0005", "f0018", "f0019", "f0020", "f0021", "f0022", "f0023"]);
    expect(kids[kids.length - 1]?.hidden).toBe(18);
  });

  it("drops the pill once every batch is revealed", () => {
    const many = nFolders(14);
    const all = visibleChildren(many, state({ open: [many.uid], batches: new Map([[many.uid, new Set([1, 2])]]) }), 6);
    expect(all).toHaveLength(14);
    expect(all.some((k) => k.kind === "more")).toBe(false);
  });

  it("never shows a folder past its ceiling, and says so on a pill that does nothing", () => {
    const huge = nFolders(FOLDER_CEILING + 40);
    const everyBatch = new Set(Array.from({ length: Math.ceil((FOLDER_CEILING + 40) / 40) }, (_, i) => i).filter((i) => i > 0));
    const kids = visibleChildren(huge, state({ open: [huge.uid], batches: new Map([[huge.uid, everyBatch]]) }), 40);
    expect(kids).toHaveLength(FOLDER_CEILING + 1);
    const pill = kids[kids.length - 1];
    expect(pill?.kind).toBe("more");
    expect(pill?.hidden).toBe(40);
    expect(pill?.capped).toBe(true);
  });

  it("marks the first pill as not capped, so clicking it expands the folder", () => {
    const many = buildTree(
      { name: "Vault", path: "/", children: Array.from({ length: 9 }, (_, i) => folder(`f${i}`, "", [])) },
      new UidRegistry(),
    );
    const kids = visibleChildren(many, state({ open: [many.uid] }), 6);
    expect(kids[kids.length - 1]?.capped).toBe(false);
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

describe("nextBatchFor", () => {
  const folderOf = (count: number): TreeNode =>
    buildTree({ name: "Vault", path: "/", children: Array.from({ length: count }, (_, i) => folder(`f${i}`, "", [])) }, new UidRegistry());

  it("offers the lowest batch not shown yet", () => {
    const f = folderOf(30);
    expect(nextBatchFor(f, state({ open: [f.uid] }), 6)).toBe(1);
    expect(nextBatchFor(f, state({ open: [f.uid], batches: new Map([[f.uid, new Set([1])]]) }), 6)).toBe(2);
    expect(nextBatchFor(f, state({ open: [f.uid], batches: new Map([[f.uid, new Set([2])]]) }), 6)).toBe(1);
  });

  it("offers nothing once everything is shown", () => {
    const f = folderOf(14);
    expect(nextBatchFor(f, state({ open: [f.uid], batches: new Map([[f.uid, new Set([1, 2])]]) }), 6)).toBeNull();
  });

  it("offers nothing for a list that fits", () => {
    const f = folderOf(5);
    expect(nextBatchFor(f, state({ open: [f.uid] }), 6)).toBeNull();
  });

  it("offers nothing at the ceiling", () => {
    const f = folderOf(FOLDER_CEILING + 100);
    const revealed = new Set(Array.from({ length: Math.ceil(FOLDER_CEILING / 40) }, (_, i) => i).filter((i) => i > 0));
    expect(nextBatchFor(f, state({ open: [f.uid], batches: new Map([[f.uid, revealed]]) }), 40)).toBeNull();
  });
});

describe("pickWithin", () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ uid: `n${i}` }));

  it("returns everything when it fits", () => {
    expect(pickWithin(items, 10)).toEqual(items);
    expect(pickWithin(items, 50)).toEqual(items);
  });

  it("takes the first ones when nothing is preferred", () => {
    expect(pickWithin(items, 3).map((i) => i.uid)).toEqual(["n0", "n1", "n2"]);
  });

  it("takes preferred items first and keeps the original order", () => {
    const picked = pickWithin(items, 3, new Set(["n8", "n5"]));
    expect(picked.map((i) => i.uid)).toEqual(["n0", "n5", "n8"]);
  });

  it("fills up from the rest when there are fewer preferred items than room", () => {
    const picked = pickWithin(items, 4, new Set(["n9"]));
    expect(picked.map((i) => i.uid)).toEqual(["n0", "n1", "n2", "n9"]);
  });

  it("cuts preferred items off at the cap", () => {
    const picked = pickWithin(items, 2, new Set(["n3", "n4", "n5"]));
    expect(picked.map((i) => i.uid)).toEqual(["n3", "n4"]);
  });
});

describe("filesVisible", () => {
  it("is true globally or per folder", () => {
    expect(filesVisible(state({ filesOn: true }), "x")).toBe(true);
    expect(filesVisible(state({ filesFor: new Set(["x"]) }), "x")).toBe(true);
    expect(filesVisible(state(), "x")).toBe(false);
  });
});

describe("buildVisibleTree card budget", () => {
  const files = (dir: string, count: number): RawEntry[] =>
    Array.from({ length: count }, (_, i) => file(`n${i + 1}.md`, dir));
  const everything = (uids: string[]): VisibilityState => ({
    open: new Set(uids),
    batches: new Map(),
    filesFor: new Set(),
    filesOn: true,
  });

  it("stops at the budget and says how many were left out", () => {
    const tree = buildTree({ name: "Vault", path: "/", children: files("", 50) }, new UidRegistry());
    const root = buildVisibleTree(tree, everything([tree.uid]), 1000, 11);
    const cards = root.children.filter((c) => c.kind !== "more");
    const pill = root.children.find((c) => c.kind === "more");
    expect(cards).toHaveLength(10);
    expect(pill?.hidden).toBe(40);
    expect(pill?.capped).toBe(true);
  });

  it("fills level by level, so shallow cards always show before deep ones", () => {
    const tree = buildTree(
      {
        name: "Vault",
        path: "/",
        children: ["A", "B", "C"].map((name) => folder(name, "", files(`/${name}`, 5))),
      },
      new UidRegistry(),
    );
    const uids = [tree.uid, ...tree.children.map((c) => c.uid)];
    const root = buildVisibleTree(tree, everything(uids), 6, 7);
    // The three folders are all there; the budget runs out inside the first one.
    expect(root.children.map((c) => c.node?.name)).toEqual(["A", "B", "C"]);
    const [a, b, c] = root.children;
    expect(a?.children.filter((x) => x.kind !== "more")).toHaveLength(3);
    expect(a?.children.find((x) => x.kind === "more")?.hidden).toBe(2);
    expect(b?.children.map((x) => x.kind)).toEqual(["more"]);
    expect(b?.children[0]?.hidden).toBe(5);
    expect(c?.children[0]?.hidden).toBe(5);
  });

  it("keeps an ordinary pill when the real cards fit", () => {
    const tree = buildTree({ name: "Vault", path: "/", children: files("", 9) }, new UidRegistry());
    const state: VisibilityState = { open: new Set([tree.uid]), batches: new Map(), filesFor: new Set(), filesOn: true };
    const root = buildVisibleTree(tree, state, 6, 100);
    const pill = root.children.at(-1);
    expect(pill?.kind).toBe("more");
    expect(pill?.hidden).toBe(3);
    expect(pill?.capped).toBe(false);
  });

  it("changes nothing for a tree that fits", () => {
    const { root } = setup();
    const state: VisibilityState = { open: new Set([root.uid]), batches: new Map(), filesFor: new Set(), filesOn: true };
    expect(buildVisibleTree(root, state, 6, 1000)).toEqual(buildVisibleTree(root, state, 6, 1_000_000));
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
