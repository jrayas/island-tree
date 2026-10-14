import { describe, expect, it } from "vitest";
import { reconcileViewState } from "./sync";
import {
  createViewState,
  focusOn,
  revealBatch,
  select,
  expandLevel,
  setFilesOn,
  toggleFilesFor,
  toggleOpen,
} from "./viewState";

const valid = new Set(["root", "a", "b"]);

describe("reconcileViewState", () => {
  it("returns the same object when everything is still valid", () => {
    const state = select(toggleOpen(createViewState("root"), "a"), "b");
    expect(reconcileViewState(state, valid, "root")).toBe(state);
  });

  it("drops revealed batches of folders that no longer exist", () => {
    const state = revealBatch(revealBatch(createViewState("root"), "gone", 1), "a", 2);
    const next = reconcileViewState(state, valid, "root");
    expect(next.batches.has("gone")).toBe(false);
    expect(next.batches.get("a")?.has(2)).toBe(true);
  });

  it("drops open, filesFor and batch ids that no longer exist", () => {
    const state = toggleFilesFor(toggleOpen(createViewState("root"), "gone"), "gone");
    const next = reconcileViewState(state, valid, "root");
    expect(next.open.has("gone")).toBe(false);
    expect(next.filesFor.has("gone")).toBe(false);
    expect(next.open.has("root")).toBe(true);
  });

  it("clears a selection that no longer exists and keeps one that does", () => {
    const gone = select(createViewState("root"), "gone");
    expect(reconcileViewState(gone, valid, "root").selected).toBeNull();
    const kept = select(createViewState("root"), "a");
    expect(reconcileViewState(kept, valid, "root").selected).toBe("a");
  });

  it("sends a vanished focus back to the root", () => {
    const state = focusOn(createViewState("root"), "gone");
    expect(reconcileViewState(state, valid, "root").focusRoot).toBe("root");
  });

  it("turns Expand files off with a vanished focus, and keeps it otherwise", () => {
    const gone = setFilesOn(focusOn(createViewState("root"), "gone"), true);
    expect(reconcileViewState(gone, valid, "root").filesOn).toBe(false);
    const here = setFilesOn(focusOn(createViewState("root"), "a"), true);
    expect(reconcileViewState(here, valid, "root").filesOn).toBe(true);
  });

  it("leaves a new folder closed even while Expand folders is on", () => {
    const on = expandLevel(createViewState("root"), ["a"]);
    const next = reconcileViewState(on, new Set(["root", "a", "b"]), "root");
    expect(next).toBe(on);
    expect(next.open.has("b")).toBe(false);
  });

  it("keeps a folder closed that the user closed by hand", () => {
    const closed = toggleOpen(expandLevel(createViewState("root"), ["a"]), "a");
    const next = reconcileViewState(closed, new Set(["root", "a"]), "root");
    expect(next).toBe(closed);
    expect(next.open.has("a")).toBe(false);
  });

  it("does not change the state it was given", () => {
    const state = toggleOpen(createViewState("root"), "gone");
    reconcileViewState(state, valid, "root");
    expect(state.open.has("gone")).toBe(true);
  });
});

describe("reconcileViewState and pinned cards", () => {
  it("forgets pinned cards that no longer exist and keeps the others", () => {
    const state = { ...createViewState("root"), pinned: new Set(["a", "gone"]) };
    const next = reconcileViewState(state, valid, "root");
    expect(next.pinned).toEqual(new Set(["a"]));
  });

  it("returns the same state when every pinned card is still there", () => {
    const state = { ...createViewState("root"), pinned: new Set(["a", "b"]) };
    expect(reconcileViewState(state, valid, "root")).toBe(state);
  });
});
