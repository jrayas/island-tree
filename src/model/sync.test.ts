import { describe, expect, it } from "vitest";
import { reconcileViewState } from "./sync";
import {
  createViewState,
  focusOn,
  revealBatch,
  select,
  setFoldersOn,
  toggleFilesFor,
  toggleOpen,
} from "./viewState";

const valid = new Set(["root", "a", "b"]);
const none = new Set<string>();

describe("reconcileViewState", () => {
  it("returns the same object when everything is still valid", () => {
    const state = select(toggleOpen(createViewState("root"), "a"), "b");
    expect(reconcileViewState(state, valid, ["root", "a"], none, "root")).toBe(state);
  });

  it("drops revealed batches of folders that no longer exist", () => {
    const state = revealBatch(revealBatch(createViewState("root"), "gone", 1), "a", 2);
    const next = reconcileViewState(state, valid, [], none, "root");
    expect(next.batches.has("gone")).toBe(false);
    expect(next.batches.get("a")?.has(2)).toBe(true);
  });

  it("drops open, filesFor and batch ids that no longer exist", () => {
    const state = toggleFilesFor(toggleOpen(createViewState("root"), "gone"), "gone");
    const next = reconcileViewState(state, valid, ["root", "a"], none, "root");
    expect(next.open.has("gone")).toBe(false);
    expect(next.filesFor.has("gone")).toBe(false);
    expect(next.open.has("root")).toBe(true);
  });

  it("clears a selection that no longer exists and keeps one that does", () => {
    const gone = select(createViewState("root"), "gone");
    expect(reconcileViewState(gone, valid, [], none, "root").selected).toBeNull();
    const kept = select(createViewState("root"), "a");
    expect(reconcileViewState(kept, valid, [], none, "root").selected).toBe("a");
  });

  it("sends a vanished focus back to the root", () => {
    const state = focusOn(createViewState("root"), "gone");
    expect(reconcileViewState(state, valid, [], none, "root").focusRoot).toBe("root");
  });

  it("opens folders created since Expand folders was turned on", () => {
    const state = setFoldersOn(createViewState("root"), true, ["root", "a"], "root");
    const next = reconcileViewState(
      state,
      new Set(["root", "a", "b"]),
      ["root", "a", "b"],
      new Set(["root", "a"]),
      "root",
    );
    expect([...next.open].sort()).toEqual(["a", "b", "root"]);
  });

  it("keeps a folder closed that the user closed by hand while Expand folders is on", () => {
    const on = setFoldersOn(createViewState("root"), true, ["root", "a"], "root");
    const closed = toggleOpen(on, "a");
    const next = reconcileViewState(closed, new Set(["root", "a"]), ["root", "a"], new Set(["root", "a"]), "root");
    expect(next).toBe(closed);
    expect(next.open.has("a")).toBe(false);
  });

  it("does not open new folders when Expand folders is off", () => {
    const next = reconcileViewState(
      createViewState("root"),
      valid,
      ["root", "a", "b"],
      new Set(["root"]),
      "root",
    );
    expect(next.open.has("a")).toBe(false);
  });

  it("does not change the state it was given", () => {
    const state = toggleOpen(createViewState("root"), "gone");
    reconcileViewState(state, valid, [], none, "root");
    expect(state.open.has("gone")).toBe(true);
  });
});
