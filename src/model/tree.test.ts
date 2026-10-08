import { describe, expect, it } from "vitest";
import {
  UidRegistry,
  ancestry,
  buildTree,
  compareEntries,
  folderUids,
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

describe("UidRegistry.moved", () => {
  it("keeps the uid under the new path", () => {
    const registry = new UidRegistry();
    const uid = registry.uidFor("/a.md");
    registry.moved("/a.md", "/b/a.md");
    expect(registry.uidFor("/b/a.md")).toBe(uid);
    expect(registry.uidFor("/a.md")).not.toBe(uid);
  });

  it("takes everything under a folder along but not look-alike names", () => {
    const registry = new UidRegistry();
    const folderUid = registry.uidFor("/Notes");
    const childUid = registry.uidFor("/Notes/deep/x.md");
    const otherUid = registry.uidFor("/Notes2/x.md");
    registry.moved("/Notes", "/Archive");
    expect(registry.uidFor("/Archive")).toBe(folderUid);
    expect(registry.uidFor("/Archive/deep/x.md")).toBe(childUid);
    expect(registry.uidFor("/Notes2/x.md")).toBe(otherUid);
  });

  it("does nothing when called again for a child that already moved", () => {
    const registry = new UidRegistry();
    registry.uidFor("/Notes");
    const childUid = registry.uidFor("/Notes/x.md");
    registry.moved("/Notes", "/Archive");
    registry.moved("/Notes/x.md", "/Archive/x.md");
    expect(registry.uidFor("/Archive/x.md")).toBe(childUid);
  });

  it("ignores a move to the same path and a path it has never seen", () => {
    const registry = new UidRegistry();
    const uid = registry.uidFor("/a.md");
    registry.moved("/a.md", "/a.md");
    registry.moved("/unknown.md", "/other.md");
    expect(registry.uidFor("/a.md")).toBe(uid);
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

describe("folderUids", () => {
  it("lists every folder, including nested ones, and no files", () => {
    const root = buildTree(
      {
        name: "Vault",
        path: "/",
        children: [folder("A", [folder("B", [file("x.md", "/A/B")], "/A")]), file("top.md")],
      },
      new UidRegistry(),
    );
    const uids = folderUids(root);
    const index = indexTree(root);
    expect(uids.map((uid) => index.get(uid)?.name)).toEqual(["Vault", "A", "B"]);
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
