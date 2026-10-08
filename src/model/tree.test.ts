import { describe, expect, it } from "vitest";
import {
  UidRegistry,
  ancestry,
  buildTree,
  compareEntries,
  indexTree,
  type RawEntry,
} from "./tree";

const file = (name: string, dir = ""): RawEntry => ({ name, path: `${dir}/${name}` });
const folder = (name: string, children: RawEntry[], dir = ""): RawEntry => ({
  name,
  path: `${dir}/${name}`,
  children,
});

describe("UidRegistry", () => {
  it("gives the same uid for the same path and different uids for different paths", () => {
    const registry = new UidRegistry();
    const a = registry.uidFor("/a");
    const b = registry.uidFor("/b");
    expect(a).not.toBe(b);
    expect(registry.uidFor("/a")).toBe(a);
  });
});

describe("compareEntries", () => {
  it("puts folders before files", () => {
    expect(compareEntries({ name: "z", children: [] }, { name: "a" })).toBeLessThan(0);
    expect(compareEntries({ name: "a" }, { name: "z", children: [] })).toBeGreaterThan(0);
  });

  it("sorts names in natural order, ignoring case", () => {
    const names = ["note 10", "Note 2", "note 1"].map((name) => ({ name }));
    names.sort(compareEntries);
    expect(names.map((n) => n.name)).toEqual(["note 1", "Note 2", "note 10"]);
  });
});

describe("buildTree", () => {
  const raw: RawEntry = {
    name: "Vault",
    path: "/",
    children: [
      file("b.md"),
      folder("Zeta", [file("inner.md", "/Zeta")]),
      folder("Alpha", []),
      file("a.md"),
    ],
  };

  it("sorts children folders first and links parents", () => {
    const root = buildTree(raw, new UidRegistry());
    expect(root.kind).toBe("folder");
    expect(root.parent).toBeNull();
    expect(root.children.map((c) => c.name)).toEqual(["Alpha", "Zeta", "a.md", "b.md"]);
    expect(root.children.every((c) => c.parent === root)).toBe(true);
  });

  it("marks entries without children as files", () => {
    const root = buildTree(raw, new UidRegistry());
    expect(root.children[2]?.kind).toBe("file");
    expect(root.children[0]?.kind).toBe("folder");
  });

  it("keeps uids stable when the tree is rebuilt with the same registry", () => {
    const registry = new UidRegistry();
    const first = buildTree(raw, registry);
    const second = buildTree(raw, registry);
    expect(second.uid).toBe(first.uid);
    expect(second.children.map((c) => c.uid)).toEqual(first.children.map((c) => c.uid));
  });

  it("does not change the input", () => {
    const before = JSON.stringify(raw);
    buildTree(raw, new UidRegistry());
    expect(JSON.stringify(raw)).toBe(before);
  });
});

describe("indexTree and ancestry", () => {
  const root = buildTree(
    { name: "Vault", path: "/", children: [folder("A", [file("x.md", "/A")])] },
    new UidRegistry(),
  );

  it("indexes every node by uid", () => {
    const index = indexTree(root);
    expect(index.size).toBe(3);
    expect(index.get(root.uid)).toBe(root);
  });

  it("returns the chain from the root to a node", () => {
    const leaf = root.children[0]?.children[0];
    expect(leaf).toBeDefined();
    expect(ancestry(leaf).map((n) => n.name)).toEqual(["Vault", "A", "x.md"]);
  });
});
