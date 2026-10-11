import { describe, expect, it } from "vitest";
import { revealOne } from "./reveal";
import { UidRegistry, buildTree, indexTree, type RawEntry, type TreeNode } from "./tree";
import { createViewState, focusOn, select, toggleOpen } from "./viewState";
import { buildVisibleTree, flattenVisible } from "./visibility";

const dir = (path: string, children: RawEntry[]): RawEntry => ({ name: path.split("/").pop() ?? "", path, children });
const file = (path: string): RawEntry => ({ name: path.split("/").pop() ?? "", path });

// Vault > A > B > deep.md, and Vault > Many with 100 files and 100 folders.
const root = buildTree(
  dir("/", [
    dir("/A", [dir("/A/B", [file("/A/B/deep.md"), file("/A/B/other.md")]), file("/A/side.md")]),
    dir("/C", []),
    dir("/Many", [
      ...Array.from({ length: 100 }, (_, i) => dir("/Many/folder " + String(i).padStart(3, "0"), [])),
      ...Array.from({ length: 100 }, (_, i) => file("/Many/file " + String(i).padStart(3, "0") + ".md")),
    ]),
  ]),
  new UidRegistry(),
);
const nodes = indexTree(root);
const at = (path: string): TreeNode => {
  const found = [...nodes.values()].find((n) => n.path === path);
  if (!found) throw new Error(path);
  return found;
};
const shown = (state: ReturnType<typeof createViewState>): string[] =>
  flattenVisible(buildVisibleTree(root, state, 40)).map((item) => item.node?.path ?? item.id);

describe("revealOne", () => {
  it("opens the folders above a card, pins the path, and selects the card", () => {
    const state = revealOne(createViewState(root.uid), at("/A/B/deep.md"));
    expect(state.selected).toBe(at("/A/B/deep.md").uid);
    expect(state.open.has(at("/A").uid)).toBe(true);
    expect(state.open.has(at("/A/B").uid)).toBe(true);
    expect(state.open.has(root.uid)).toBe(true);
    expect(state.pinned).toEqual(new Set([at("/A").uid, at("/A/B").uid, at("/A/B/deep.md").uid]));
  });

  it("shows a file even though files are off, and not the files beside it", () => {
    const state = revealOne(createViewState(root.uid), at("/A/B/deep.md"));
    const paths = shown(state);
    expect(paths).toContain("/A/B/deep.md");
    expect(paths).not.toContain("/A/B/other.md");
    expect(paths).not.toContain("/A/side.md");
  });

  it("loads only the one card out of a long list, the rest behind a pill", () => {
    const state = revealOne(createViewState(root.uid), at("/Many/file 077.md"));
    const paths = shown(state);
    expect(paths).toContain("/Many/file 077.md");
    // The first batch of folders is listed, plus the one file, plus "+N more" for the rest.
    const insideMany = paths.filter((p) => p.startsWith("/Many/"));
    expect(insideMany.length).toBe(40 + 1);
    expect(paths.filter((p) => p.startsWith("more:")).length).toBe(1);
    expect(paths).not.toContain("/Many/file 076.md");
  });

  it("shows a folder far down its parent's list the same way", () => {
    const state = revealOne(createViewState(root.uid), at("/Many/folder 090"));
    const paths = shown(state);
    expect(paths).toContain("/Many/folder 090");
    expect(paths).not.toContain("/Many/folder 089");
  });

  it("replaces the previous pick, so only one path is pinned", () => {
    const first = revealOne(createViewState(root.uid), at("/Many/file 077.md"));
    const second = revealOne(first, at("/A/B/deep.md"));
    expect(second.pinned.has(at("/Many/file 077.md").uid)).toBe(false);
    expect(shown(second)).not.toContain("/Many/file 077.md");
  });

  it("keeps a focus that holds the card, and leaves a focus that does not", () => {
    const inside = revealOne(focusOn(createViewState(root.uid), at("/A").uid), at("/A/B/deep.md"));
    expect(inside.focusRoot).toBe(at("/A").uid);
    const outside = revealOne(focusOn(createViewState(root.uid), at("/C").uid), at("/A/B/deep.md"));
    expect(outside.focusRoot).toBe(root.uid);
    const above = revealOne(focusOn(createViewState(root.uid), at("/A/B").uid), at("/A"));
    expect(above.focusRoot).toBe(root.uid);
  });

  it("does not change anything else about the view", () => {
    const before = toggleOpen(select(createViewState(root.uid), at("/C").uid), at("/C").uid);
    const after = revealOne(before, at("/A/B/deep.md"));
    expect(after.open.has(at("/C").uid)).toBe(true);
    expect(after.filesOn).toBe(false);
    expect(after.batches.size).toBe(0);
  });

  it("goes to the vault root without pinning anything", () => {
    const state = revealOne(createViewState(root.uid), root);
    expect(state.selected).toBe(root.uid);
    expect(state.pinned.size).toBe(0);
  });
});
