import { describe, expect, it } from "vitest";
import { computeLayout, type LayoutOptions } from "../layout/layout";
import { CountCache, indexByPath } from "./counts";
import { searchTree, withSearchReveal } from "./search";
import { balancedVault, countRawFiles, deepVault, flatVault } from "./synthetic";
import { buildTree, folderUids, indexTree, UidRegistry } from "./tree";
import { FOLDER_CEILING, MAX_CARDS } from "./limits";
import { buildVisibleTree, flattenVisible } from "./visibility";
import { createViewState, revealBatch, setFilesOn, type ViewState } from "./viewState";

const OPTIONS: LayoutOptions = {
  cardWidth: 116,
  cardHeight: 40,
  gap: 14,
  levelGap: 44,
  ringRadius: 130,
  ringStep: 90,
  mindMapView: "balanced",
};
const LIMIT = 40;

/** Every folder open and every file showing, the heaviest view there is. */
function openEverything(rootUid: string, folders: readonly string[]): ViewState {
  return setFilesOn({ ...createViewState(rootUid), open: new Set(folders) }, true);
}

/** Reveals every batch a folder allows, as clicking "+N more" over and over would. */
function revealAll(state: ViewState, uid: string): ViewState {
  let next = state;
  for (let batch = 1; batch <= Math.ceil(FOLDER_CEILING / LIMIT); batch++) next = revealBatch(next, uid, batch);
  return next;
}

/** Runs a step, returning how long it took in milliseconds. */
function time<T>(run: () => T): { ms: number; value: T } {
  const start = performance.now();
  const value = run();
  return { ms: performance.now() - start, value };
}

// The ceilings are deliberately generous (several times what a normal machine needs), so they
// only fail when something has become far slower, not because a build agent was busy.
describe("a vault of 10,000 files", () => {
  const raw = balancedVault();
  it("really holds 10,000 files", () => {
    expect(countRawFiles(raw)).toBe(10_000);
  });

  it("builds, indexes and searches quickly", () => {
    const registry = new UidRegistry();
    const built = time(() => buildTree(raw, registry));
    const indexed = time(() => indexTree(built.value));
    const folders = time(() => folderUids(built.value));
    const search = time(() => searchTree(built.value, "note 17"));
    expect(indexed.value.size).toBeGreaterThan(10_000);
    expect(folders.value.length).toBe(601);
    expect(built.ms).toBeLessThan(1500);
    expect(indexed.ms).toBeLessThan(500);
    expect(search.ms).toBeLessThan(500);
  });

  it("counts the whole vault in slices, then updates one folder's chain without recounting it", async () => {
    const tree = buildTree(raw, new UidRegistry());
    const cache = new CountCache();
    const started = performance.now();
    await cache.build(tree, { chunk: 250, yieldNow: async () => {} });
    const built = performance.now() - started;
    expect(cache.get("/")?.total).toEqual({ folders: 600, files: 10_000 });
    expect(built).toBeLessThan(1500);

    // One note added to one topic: only the chain above it is touched.
    const topic = tree.children[0]?.children[0];
    if (!topic) throw new Error("The made-up vault has no topic.");
    topic.children.push({ uid: "new", kind: "file", name: "added.md", path: `${topic.path}/added.md`, parent: topic, children: [] });
    const update = time(() => cache.applyChanges(indexByPath(tree), [`${topic.path}/added.md`]));
    expect(cache.get("/")?.total?.files).toBe(10_001);
    expect(cache.get(topic.path)?.files).toBe(21);
    expect(update.ms).toBeLessThan(500);
  });

  it("keeps the visible tree small, whatever the vault size", () => {
    const tree = buildTree(raw, new UidRegistry());
    const state = openEverything(tree.uid, folderUids(tree));
    const visible = time(() => flattenVisible(buildVisibleTree(tree, state, LIMIT)));
    expect(visible.value.length).toBeLessThan(MAX_CARDS * 2);
    expect(visible.ms).toBeLessThan(1500);
  });

  it("a search that matches everything still draws a bounded number of cards", () => {
    const tree = buildTree(raw, new UidRegistry());
    const result = searchTree(tree, "note");
    expect(result?.hits.size).toBe(10_000);
    const state = withSearchReveal(createViewState(tree.uid), result);
    const visible = time(() => flattenVisible(buildVisibleTree(tree, state, LIMIT)));
    // Pills do not use up the budget, so allow some extra.
    expect(visible.value.length).toBeLessThan(MAX_CARDS * 2);
    expect(visible.ms).toBeLessThan(1500);
  });

  it("searching reveals matches without opening the vault", () => {
    const tree = buildTree(raw, new UidRegistry());
    const result = searchTree(tree, "area 42");
    const state = withSearchReveal(createViewState(tree.uid), result);
    const visible = time(() => flattenVisible(buildVisibleTree(tree, state, LIMIT)));
    expect(visible.value.length).toBeLessThan(500);
  });
});

describe("laying out many cards", () => {
  const tree = buildTree(flatVault(20_000), new UidRegistry());
  const folder = tree.children[0];
  if (!folder) throw new Error("The made-up vault has no folder.");

  for (const mode of ["vertical", "radial", "mindmap"] as const) {
    it(`places ${mode} for a folder with every file listed`, () => {
      const state = revealAll(openEverything(tree.uid, [tree.uid, folder.uid]), folder.uid);
      const visible = buildVisibleTree(tree, state, LIMIT);
      const count = flattenVisible(visible).length;
      const placed = time(() => computeLayout(mode, visible, false, OPTIONS));
      expect(placed.value.positions.size).toBe(count);
      expect(placed.ms).toBeLessThan(2000);
    });
  }
});

describe("a deep vault", () => {
  it("lays out a chain of folders", () => {
    const tree = buildTree(deepVault(), new UidRegistry());
    const state = openEverything(tree.uid, folderUids(tree));
    const visible = buildVisibleTree(tree, state, LIMIT);
    for (const mode of ["vertical", "radial", "mindmap"] as const) {
      const placed = time(() => computeLayout(mode, visible, false, OPTIONS));
      expect(placed.value.positions.size).toBe(flattenVisible(visible).length);
      expect(placed.ms).toBeLessThan(2000);
    }
  });
});
