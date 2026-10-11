import { describe, expect, it } from "vitest";
import { suggest } from "./suggest";
import { UidRegistry, buildTree, type RawEntry } from "./tree";

const dir = (path: string, children: RawEntry[]): RawEntry => ({ name: path.split("/").pop() ?? "", path, children });
const file = (path: string): RawEntry => ({ name: path.split("/").pop() ?? "", path });

// The vault root carries the vault's name, as the real one does.
const vault = (children: RawEntry[]): RawEntry => ({ name: "Vault", path: "/", children });

const root = buildTree(
  vault([
    dir("/azure-docs", [
      dir("/azure-docs/api-reference", [file("/azure-docs/api-reference/index.md")]),
      dir("/azure-docs/articles", [
        dir("/azure-docs/articles/azure-stack-edge", [file("/azure-docs/articles/azure-stack-edge/overview.md")]),
        dir("/azure-docs/articles/includes", [file("/azure-docs/articles/includes/readme.md")]),
      ]),
    ]),
    dir("/Projects", [
      dir("/Projects/Plugin", [file("/Projects/Plugin/Roadmap.md")]),
      dir("/Projects/includes", [file("/Projects/includes/notes.md")]),
      file("/Projects/readme.md"),
    ]),
    dir("/Reference", []),
    dir("/Inbox", [file("/Inbox/Roadmap.md")]),
  ]),
  new UidRegistry(),
);
// buildTree gives the root the path "/" and its own name; nothing here depends on it being listed.

const folders = { files: false, limit: 8 };
const withFiles = { files: true, limit: 8 };
const names = (query: string, options = folders): string[] => suggest(root, query, options).items.map((s) => s.name);

describe("suggest", () => {
  it("suggests nothing for an empty or blank query", () => {
    expect(suggest(root, "", folders)).toEqual({ items: [], total: 0 });
    expect(suggest(root, "   ", folders)).toEqual({ items: [], total: 0 });
  });

  it("lists folders only by default, never files, and never the vault itself", () => {
    const result = suggest(root, "readme", folders);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(names("a")).not.toContain("Vault");
  });

  it("ranks an exact name first, then the start of a name, then the start of a word, then anywhere", () => {
    // "ref": Reference starts with it, api-reference has it at the start of a word, and "xref" only contains it.
    const tree = buildTree(
      vault([dir("/xref", []), dir("/api-reference", []), dir("/Reference", []), dir("/ref", [])]),
      new UidRegistry(),
    );
    expect(suggest(tree, "ref", folders).items.map((s) => s.name)).toEqual(["ref", "Reference", "api-reference", "xref"]);
  });

  it("ignores case and stray spaces", () => {
    expect(names("  PROJECTS ")).toEqual(["Projects"]);
  });

  it("prefers a shorter name, then a shallower one, within the same kind of match", () => {
    // Both contain "includes" exactly; the shallower one comes first.
    expect(suggest(root, "includes", folders).items.map((s) => s.where)).toEqual([
      "Vault / Projects",
      "Vault / azure-docs / articles",
    ]);
  });

  it("tells same-named folders apart by where they live", () => {
    const result = suggest(root, "includes", folders);
    expect(result.items).toHaveLength(2);
    expect(new Set(result.items.map((s) => s.uid)).size).toBe(2);
  });

  it("marks the part that matched, for highlighting", () => {
    expect(suggest(root, "ref", folders).items.find((s) => s.name === "Reference")?.marks).toEqual([[0, 3]]);
    expect(suggest(root, "ref", folders).items.find((s) => s.name === "api-reference")?.marks).toEqual([[4, 7]]);
  });

  it("finds letters in order when nothing contains the text, but only from three letters", () => {
    expect(names("prj")).toEqual(["Projects"]);
    expect(suggest(root, "prj", folders).items[0]?.marks).toEqual([[0, 2], [3, 4]]);
    expect(names("pj")).toEqual([]);
  });

  it("does not match letters that are far apart", () => {
    const apart = buildTree(vault([dir("/a" + "-".repeat(20) + "bc", [])]), new UidRegistry());
    expect(suggest(apart, "abc", folders).items).toEqual([]);
    // The same letters close together do match.
    const near = buildTree(vault([dir("/a-b-c", [])]), new UidRegistry());
    expect(suggest(near, "abc", folders).items).toHaveLength(1);
  });

  it("lists at most the limit and counts all of them", () => {
    const many = buildTree(
      vault(Array.from({ length: 30 }, (_, i) => dir("/note" + i, []))),
      new UidRegistry(),
    );
    const result = suggest(many, "note", { files: false, limit: 8 });
    expect(result.items).toHaveLength(8);
    expect(result.total).toBe(30);
    expect(suggest(many, "note", { files: false, limit: 0 }).items).toEqual([]);
  });

  describe("with files on", () => {
    it("finds a file only by its whole name, with or without the extension", () => {
      expect(names("roadmap.md", withFiles)).toEqual(["Roadmap.md", "Roadmap.md"]);
      expect(names("roadmap", withFiles)).toEqual(["Roadmap.md", "Roadmap.md"]);
      expect(names("ROADMAP", withFiles)).toEqual(["Roadmap.md", "Roadmap.md"]);
    });

    it("does not turn a loose word into files", () => {
      expect(names("road", withFiles)).toEqual([]);
      expect(names("note", withFiles)).toEqual([]);
    });

    it("keeps folders matching loosely and lists files after better folder matches", () => {
      const result = suggest(root, "readme", withFiles);
      expect(result.items.map((s) => s.kind)).toEqual(["file", "file"]);
      expect(result.total).toBe(2);
    });

    it("tells two files of the same name apart by their folders", () => {
      const result = suggest(root, "roadmap.md", withFiles);
      expect(result.items.map((s) => s.where).sort()).toEqual(["Vault / Inbox", "Vault / Projects / Plugin"]);
      expect(result.items.every((s) => s.kind === "file")).toBe(true);
    });
  });

  describe("with a slash in the query", () => {
    it("reads it as part of a path: folders whose path contains it", () => {
      expect(names("azure-docs/articles")).toEqual(["articles", "includes", "azure-stack-edge"]);
    });

    it("finds a file by its whole path when files are on", () => {
      expect(names("/Inbox/Roadmap.md", withFiles)).toEqual(["Roadmap.md"]);
      expect(names("inbox/roadmap", withFiles)).toEqual(["Roadmap.md"]);
      expect(names("Inbox/Road", withFiles)).toEqual([]);
    });
  });

  it("copes with a very large vault quickly", () => {
    const big = buildTree(
      vault(Array.from({ length: 600 }, (_, f) => dir("/f" + f, Array.from({ length: 30 }, (__, i) => file("/f" + f + "/note " + i + ".md"))))),
      new UidRegistry(),
    );
    const started = performance.now();
    const result = suggest(big, "f5", { files: true, limit: 8 });
    expect(performance.now() - started).toBeLessThan(1000);
    expect(result.items.length).toBeGreaterThan(0);
  });
});
