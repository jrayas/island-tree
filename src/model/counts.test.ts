import { describe, expect, it } from "vitest";
import { CountCache, indexByPath } from "./counts";
import { balancedVault } from "./synthetic";
import { UidRegistry, buildTree, type RawEntry, type TreeNode } from "./tree";

const file = (name: string, dir: string): RawEntry => ({ name, path: dir === "/" ? name : `${dir}/${name}` });
const folder = (name: string, dir: string, children: (path: string) => RawEntry[]): RawEntry => {
  const path = dir === "/" ? name : `${dir}/${name}`;
  return { name, path, children: children(path) };
};

// /
//   Projects
//     Plugin
//       main.ts
//     roadmap.md
//   Daily
//     one.md
//     two.md
//   Archive          (empty)
//   top.md
const raw = (): RawEntry => ({
  name: "Vault",
  path: "/",
  children: [
    folder("Projects", "/", (p) => [folder("Plugin", p, (q) => [file("main.ts", q)]), file("roadmap.md", p)]),
    folder("Daily", "/", (p) => [file("one.md", p), file("two.md", p)]),
    folder("Archive", "/", () => []),
    file("top.md", "/"),
  ],
});

const build = async (entry: RawEntry = raw()): Promise<{ tree: TreeNode; cache: CountCache }> => {
  const tree = buildTree(entry, new UidRegistry());
  const cache = new CountCache();
  await cache.build(tree, { chunk: 100, yieldNow: async () => {} });
  return { tree, cache };
};

describe("CountCache.build", () => {
  it("counts direct and total folders and files for every folder, by path", async () => {
    const { cache } = await build();
    expect(cache.get("/")).toEqual({ folders: 3, files: 1, total: { folders: 4, files: 5 } });
    expect(cache.get("Projects")).toEqual({ folders: 1, files: 1, total: { folders: 1, files: 2 } });
    expect(cache.get("Projects/Plugin")).toEqual({ folders: 0, files: 1, total: { folders: 0, files: 1 } });
    expect(cache.get("Daily")).toEqual({ folders: 0, files: 2, total: { folders: 0, files: 2 } });
    expect(cache.get("Archive")).toEqual({ folders: 0, files: 0, total: { folders: 0, files: 0 } });
    expect(cache.size).toBe(5);
  });

  it("reports ready only once it has finished", async () => {
    const tree = buildTree(raw(), new UidRegistry());
    const cache = new CountCache();
    expect(cache.ready).toBe(false);
    await cache.build(tree, { chunk: 100, yieldNow: async () => {} });
    expect(cache.ready).toBe(true);
  });

  it("gives the browser a turn between slices", async () => {
    const tree = buildTree(balancedVault(10, 5, 4), new UidRegistry());
    let turns = 0;
    const cache = new CountCache();
    await cache.build(tree, { chunk: 10, yieldNow: async () => void (turns += 1) });
    // 1 vault + 10 areas + 50 topics = 61 folders, a turn after each 10.
    expect(turns).toBe(6);
  });

  it("can be abandoned between slices, leaving it not ready", async () => {
    const tree = buildTree(balancedVault(10, 5, 4), new UidRegistry());
    const cache = new CountCache();
    let turns = 0;
    const finished = await cache.build(tree, {
      chunk: 10,
      yieldNow: async () => void (turns += 1),
      shouldStop: () => turns >= 2,
    });
    expect(finished).toBe(false);
    expect(cache.ready).toBe(false);
  });

  it("handles an empty vault and an empty folder", async () => {
    const { cache } = await build({ name: "Vault", path: "/", children: [] });
    expect(cache.get("/")).toEqual({ folders: 0, files: 0, total: { folders: 0, files: 0 } });
  });

  it("handles folders holding only subfolders", async () => {
    const { cache } = await build({
      name: "Vault",
      path: "/",
      children: [folder("A", "/", (p) => [folder("B", p, () => [])])],
    });
    expect(cache.get("A")).toEqual({ folders: 1, files: 0, total: { folders: 1, files: 0 } });
    expect(cache.get("/")?.total).toEqual({ folders: 2, files: 0 });
  });

  it("keys by path, so names with spaces, accents and other scripts work", async () => {
    const names = ["Café notes", "日本語のノート", "Ünïcödé & more", "folder (1)"];
    const { cache } = await build({
      name: "Vault",
      path: "/",
      children: names.map((name) => folder(name, "/", (p) => [file("a.md", p)])),
    });
    for (const name of names) expect(cache.get(name)).toEqual({ folders: 0, files: 1, total: { folders: 0, files: 1 } });
  });
});

describe("CountCache.countsFor", () => {
  it("counts a folder that is not cached yet, once, and stores it", () => {
    const tree = buildTree(raw(), new UidRegistry());
    const cache = new CountCache();
    const projects = tree.children.find((c) => c.name === "Projects");
    expect(projects).toBeDefined();
    const first = cache.countsFor(projects as TreeNode);
    expect(first).toEqual({ folders: 1, files: 1, total: null });
    expect(cache.countsFor(projects as TreeNode)).toBe(first);
    expect(cache.size).toBe(1);
  });

  it("returns the cached entry, with totals, after a build", async () => {
    const { tree, cache } = await build();
    const projects = tree.children.find((c) => c.name === "Projects") as TreeNode;
    expect(cache.countsFor(projects).total).toEqual({ folders: 1, files: 2 });
  });
});

describe("CountCache.applyChanges", () => {
  const rebuilt = async (
    before: RawEntry,
    after: RawEntry,
    changed: string[],
  ): Promise<{ cache: CountCache; fresh: CountCache }> => {
    const { cache } = await build(before);
    const tree = buildTree(after, new UidRegistry());
    cache.applyChanges(indexByPath(tree), changed);
    // The answer a full recount gives, which an update must always agree with.
    const fresh = new CountCache();
    await fresh.build(tree, { chunk: 100, yieldNow: async () => {} });
    return { cache, fresh };
  };
  const agree = (cache: CountCache, fresh: CountCache): void => {
    expect(cache.size).toBe(fresh.size);
    for (const path of ["/", "Projects", "Projects/Plugin", "Daily", "Archive", "Moved", "Moved/Plugin"]) {
      expect(cache.get(path), path).toEqual(fresh.get(path));
    }
  };

  it("updates the chain above a created file", async () => {
    const after = raw();
    after.children?.[0] && (after.children[0].children ?? []).push(file("new.md", "Projects"));
    const { cache, fresh } = await rebuilt(raw(), after, ["Projects/new.md"]);
    expect(cache.get("Projects")?.total).toEqual({ folders: 1, files: 3 });
    expect(cache.get("/")?.total).toEqual({ folders: 4, files: 6 });
    agree(cache, fresh);
  });

  it("updates the chain above a deleted file", async () => {
    const after = raw();
    after.children?.[1] && (after.children[1].children = [file("one.md", "Daily")]);
    const { cache, fresh } = await rebuilt(raw(), after, ["Daily/two.md"]);
    expect(cache.get("Daily")).toEqual({ folders: 0, files: 1, total: { folders: 0, files: 1 } });
    expect(cache.get("/")?.total).toEqual({ folders: 4, files: 4 });
    agree(cache, fresh);
  });

  it("forgets a deleted folder and everything under it", async () => {
    const after = raw();
    after.children = (after.children ?? []).filter((c) => c.name !== "Projects");
    const { cache, fresh } = await rebuilt(raw(), after, ["Projects"]);
    expect(cache.get("Projects")).toBeUndefined();
    expect(cache.get("Projects/Plugin")).toBeUndefined();
    expect(cache.get("/")?.total).toEqual({ folders: 2, files: 3 });
    agree(cache, fresh);
  });

  it("counts a new folder along with everything pasted into it", async () => {
    const after = raw();
    after.children?.push(folder("Moved", "/", (p) => [folder("Plugin", p, (q) => [file("a.md", q), file("b.md", q)]), file("c.md", p)]));
    const { cache, fresh } = await rebuilt(raw(), after, ["Moved", "Moved/Plugin", "Moved/Plugin/a.md", "Moved/Plugin/b.md", "Moved/c.md"]);
    expect(cache.get("Moved")?.total).toEqual({ folders: 1, files: 3 });
    expect(cache.get("/")?.total).toEqual({ folders: 6, files: 8 });
    agree(cache, fresh);
  });

  it("updates both the old and the new parent chains when a folder moves", async () => {
    // Plugin moves out of Projects into Daily.
    const after: RawEntry = {
      name: "Vault",
      path: "/",
      children: [
        folder("Projects", "/", (p) => [file("roadmap.md", p)]),
        folder("Daily", "/", (p) => [file("one.md", p), file("two.md", p), folder("Plugin", p, (q) => [file("main.ts", q)])]),
        folder("Archive", "/", () => []),
        file("top.md", "/"),
      ],
    };
    const { cache, fresh } = await rebuilt(raw(), after, ["Projects/Plugin", "Daily/Plugin"]);
    expect(cache.get("Projects")).toEqual({ folders: 0, files: 1, total: { folders: 0, files: 1 } });
    expect(cache.get("Daily")).toEqual({ folders: 1, files: 2, total: { folders: 1, files: 3 } });
    expect(cache.get("Projects/Plugin")).toBeUndefined();
    expect(cache.get("Daily/Plugin")).toEqual({ folders: 0, files: 1, total: { folders: 0, files: 1 } });
    expect(cache.get("/")?.total).toEqual({ folders: 4, files: 5 });
    agree(cache, fresh);
  });

  it("updates a renamed folder, forgetting the old name", async () => {
    const after = raw();
    const projects = after.children?.[0];
    if (projects) {
      projects.name = "Work";
      projects.path = "Work";
      projects.children = [folder("Plugin", "Work", (q) => [file("main.ts", q)]), file("roadmap.md", "Work")];
    }
    const { cache } = await rebuilt(raw(), after, ["Projects", "Work"]);
    expect(cache.get("Projects")).toBeUndefined();
    expect(cache.get("Work")).toEqual({ folders: 1, files: 1, total: { folders: 1, files: 2 } });
    expect(cache.get("Work/Plugin")?.total).toEqual({ folders: 0, files: 1 });
    expect(cache.get("/")?.total).toEqual({ folders: 4, files: 5 });
  });

  it("does nothing for a change that is not in the vault any more and has no folder above", async () => {
    const { cache } = await build();
    const tree = buildTree(raw(), new UidRegistry());
    cache.applyChanges(indexByPath(tree), ["Gone/forever.md"]);
    expect(cache.get("/")?.total).toEqual({ folders: 4, files: 5 });
    expect(cache.get("Gone")).toBeUndefined();
  });

  it("handles a burst of changes in one go", async () => {
    const after = raw();
    const daily = after.children?.[1];
    const added = Array.from({ length: 300 }, (_, i) => file(`bulk ${i}.md`, "Daily"));
    if (daily) daily.children = [...(daily.children ?? []), ...added];
    const { cache, fresh } = await rebuilt(raw(), after, added.map((a) => a.path));
    expect(cache.get("Daily")?.files).toBe(302);
    expect(cache.get("/")?.total?.files).toBe(305);
    agree(cache, fresh);
  });
});

describe("indexByPath", () => {
  it("finds every node by its path", () => {
    const tree = buildTree(raw(), new UidRegistry());
    const index = indexByPath(tree);
    expect(index.get("/")?.kind).toBe("folder");
    expect(index.get("Projects/Plugin/main.ts")?.kind).toBe("file");
    expect(index.size).toBe(10);
  });
});
