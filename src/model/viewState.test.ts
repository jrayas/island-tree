import { describe, expect, it } from "vitest";
import { createViewState, select, showAllFor, toggleFilesFor, toggleOpen } from "./viewState";

describe("createViewState", () => {
  it("starts with only the root open and nothing selected", () => {
    const s = createViewState("root");
    expect([...s.open]).toEqual(["root"]);
    expect(s.selected).toBeNull();
    expect(s.filesOn).toBe(false);
  });
});

describe("toggleOpen", () => {
  it("opens then closes a folder without changing the original state", () => {
    const start = createViewState("root");
    const opened = toggleOpen(start, "a");
    expect(opened.open.has("a")).toBe(true);
    expect(start.open.has("a")).toBe(false);
    expect(toggleOpen(opened, "a").open.has("a")).toBe(false);
  });
});

describe("toggleFilesFor", () => {
  it("shows a folder's files and opens it", () => {
    const s = toggleFilesFor(createViewState("root"), "a");
    expect(s.filesFor.has("a")).toBe(true);
    expect(s.open.has("a")).toBe(true);
  });

  it("hides the files again on a second toggle but keeps the folder open", () => {
    const s = toggleFilesFor(toggleFilesFor(createViewState("root"), "a"), "a");
    expect(s.filesFor.has("a")).toBe(false);
    expect(s.open.has("a")).toBe(true);
  });
});

describe("showAllFor", () => {
  it("marks the folder's overflow as expanded", () => {
    expect(showAllFor(createViewState("root"), "a").showAll.has("a")).toBe(true);
  });
});

describe("select", () => {
  it("sets and clears the selection", () => {
    const s = select(createViewState("root"), "a");
    expect(s.selected).toBe("a");
    expect(select(s, null).selected).toBeNull();
  });

  it("returns the same object when nothing changes", () => {
    const s = select(createViewState("root"), "a");
    expect(select(s, "a")).toBe(s);
  });
});
