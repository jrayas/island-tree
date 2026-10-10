import { describe, expect, it } from "vitest";
import { MAX_SAVED_PATHS, parseSavedView, restoreView, saveView, type SavedView } from "./savedView";
import { createViewState, type ViewState } from "./viewState";

// A tiny vault: ids n0 (root "/"), n1 "/Projects", n2 "/Projects/Plugin", n3 "/Daily".
const PATHS = new Map([
  ["n0", "/"],
  ["n1", "/Projects"],
  ["n2", "/Projects/Plugin"],
  ["n3", "/Daily"],
]);
const pathOf = (uid: string): string | undefined => PATHS.get(uid);
const uidOf = (path: string): string | undefined => [...PATHS].find(([, p]) => p === path)?.[0];

const left = (): ViewState => ({
  ...createViewState("n0", "radial"),
  open: new Set(["n0", "n1", "n2"]),
  batches: new Map([["n1", new Set([1, 3])]]),
  filesFor: new Set(["n2"]),
  filesOn: true,
  foldersOn: true,
  detail: true,
  selected: "n2",
  focusRoot: "n1",
  query: "road",
});

describe("saveView", () => {
  it("stores the state by path", () => {
    const saved = saveView(left(), pathOf);
    expect(saved.layoutMode).toBe("radial");
    expect(saved.open).toEqual(["/", "/Projects", "/Projects/Plugin"]);
    expect(saved.batches).toEqual({ "/Projects": [1, 3] });
    expect(saved.filesFor).toEqual(["/Projects/Plugin"]);
    expect(saved.selected).toBe("/Projects/Plugin");
    expect(saved.focusRoot).toBe("/Projects");
    expect(saved.query).toBe("road");
  });

  it("leaves out cards that have no path any more", () => {
    const state = { ...left(), open: new Set(["n0", "gone"]), selected: "gone", focusRoot: "gone" };
    const saved = saveView(state, pathOf);
    expect(saved.open).toEqual(["/"]);
    expect(saved.selected).toBeNull();
    expect(saved.focusRoot).toBe("/");
  });

  it("survives a round trip through JSON", () => {
    const saved = saveView(left(), pathOf);
    expect(parseSavedView(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });
});

describe("parseSavedView", () => {
  const good = (): SavedView => saveView(left(), pathOf);

  it("accepts a good state", () => {
    expect(parseSavedView(good())).toEqual(good());
  });

  it("rejects things that are not a state", () => {
    expect(parseSavedView(undefined)).toBeNull();
    expect(parseSavedView(null)).toBeNull();
    expect(parseSavedView("open")).toBeNull();
    expect(parseSavedView(42)).toBeNull();
    expect(parseSavedView({})).toBeNull();
  });

  it("ignores batches that are not whole positive numbers, and an old state without batches", () => {
    const messy = parseSavedView({ ...good(), batches: { "/a": [1, -2, 1.5, "x", 4], "/b": "no", "/c": [] } });
    expect(messy?.batches).toEqual({ "/a": [1, 4] });
    const { batches: _unused, ...old } = good();
    void _unused;
    expect(parseSavedView({ ...old, showAll: ["/Projects"] })?.batches).toEqual({});
    expect(parseSavedView({ ...good(), batches: [1, 2] })?.batches).toEqual({});
  });

  it("rejects wrong types and unknown layouts", () => {
    expect(parseSavedView({ ...good(), layoutMode: "spiral" })).toBeNull();
    expect(parseSavedView({ ...good(), open: "/" })).toBeNull();
    expect(parseSavedView({ ...good(), open: ["/", 3] })).toBeNull();
    expect(parseSavedView({ ...good(), detail: "yes" })).toBeNull();
    expect(parseSavedView({ ...good(), selected: 7 })).toBeNull();
    expect(parseSavedView({ ...good(), focusRoot: null })).toBeNull();
  });

  it("bounds the number of paths and the length of the search text", () => {
    const many = Array.from({ length: MAX_SAVED_PATHS + 50 }, (_, i) => `/f${i}`);
    expect(parseSavedView({ ...good(), open: many })?.open).toHaveLength(MAX_SAVED_PATHS);
    expect(parseSavedView({ ...good(), query: "x".repeat(900) })?.query).toHaveLength(200);
  });
});

describe("restoreView", () => {
  it("puts the saved state back", () => {
    const saved = saveView(left(), pathOf);
    const state = restoreView(saved, uidOf, createViewState("n0"), "n0");
    expect(state.layoutMode).toBe("radial");
    expect([...state.open].sort()).toEqual(["n0", "n1", "n2"]);
    expect([...(state.batches.get("n1") ?? [])]).toEqual([1, 3]);
    expect([...state.filesFor]).toEqual(["n2"]);
    expect(state.selected).toBe("n2");
    expect(state.focusRoot).toBe("n1");
    expect(state.query).toBe("road");
    expect(state.detail).toBe(true);
    expect(state.filesOn).toBe(true);
    expect(state.foldersOn).toBe(true);
  });

  it("ignores revealed batches of folders that are no longer in the vault", () => {
    const saved: SavedView = { ...saveView(left(), pathOf), batches: { "/Gone": [1], "/Projects": [2] } };
    const state = restoreView(saved, uidOf, createViewState("n0"), "n0");
    expect([...state.batches.keys()]).toEqual(["n1"]);
  });

  it("ignores paths that are no longer in the vault", () => {
    const saved: SavedView = {
      ...saveView(left(), pathOf),
      open: ["/", "/Deleted", "/Projects"],
      selected: "/Deleted/note.md",
      focusRoot: "/Deleted",
    };
    const state = restoreView(saved, uidOf, createViewState("n0"), "n0");
    expect([...state.open].sort()).toEqual(["n0", "n1"]);
    expect(state.selected).toBeNull();
    expect(state.focusRoot).toBe("n0");
  });

  it("always keeps the vault root open, and the focused folder open", () => {
    const saved: SavedView = { ...saveView(left(), pathOf), open: [], focusRoot: "/Daily" };
    const state = restoreView(saved, uidOf, createViewState("n0"), "n0");
    expect(state.open.has("n0")).toBe(true);
    expect(state.open.has("n3")).toBe(true);
  });
});
