import { describe, expect, it } from "vitest";
import {
  createViewState,
  focusOn,
  resetFocus,
  resetView,
  select,
  setFilesOn,
  setFoldersOn,
  setLayout,
  setQuery,
  showAllFor,
  toggleFilesFor,
  toggleOpen,
} from "./viewState";

const start = () => createViewState("root");

describe("createViewState", () => {
  it("starts with only the root open, nothing selected and no focus", () => {
    const s = start();
    expect([...s.open]).toEqual(["root"]);
    expect(s.selected).toBeNull();
    expect(s.filesOn).toBe(false);
    expect(s.foldersOn).toBe(false);
    expect(s.focusRoot).toBe("root");
    expect(s.query).toBe("");
    expect(s.layoutMode).toBe("vertical");
  });

  it("can start in the radial layout", () => {
    expect(createViewState("root", "radial").layoutMode).toBe("radial");
  });
});

describe("toggleOpen", () => {
  it("opens then closes a folder without changing the original state", () => {
    const original = start();
    const opened = toggleOpen(original, "a");
    expect(opened.open.has("a")).toBe(true);
    expect(original.open.has("a")).toBe(false);
    expect(toggleOpen(opened, "a").open.has("a")).toBe(false);
  });
});

describe("toggleFilesFor", () => {
  it("shows a folder's files and opens it", () => {
    const s = toggleFilesFor(start(), "a");
    expect(s.filesFor.has("a")).toBe(true);
    expect(s.open.has("a")).toBe(true);
  });

  it("hides the files again on a second toggle but keeps the folder open", () => {
    const s = toggleFilesFor(toggleFilesFor(start(), "a"), "a");
    expect(s.filesFor.has("a")).toBe(false);
    expect(s.open.has("a")).toBe(true);
  });
});

describe("showAllFor", () => {
  it("marks the folder's overflow as expanded", () => {
    expect(showAllFor(start(), "a").showAll.has("a")).toBe(true);
  });
});

describe("select", () => {
  it("sets and clears the selection", () => {
    const s = select(start(), "a");
    expect(s.selected).toBe("a");
    expect(select(s, null).selected).toBeNull();
  });

  it("returns the same object when nothing changes", () => {
    const s = select(start(), "a");
    expect(select(s, "a")).toBe(s);
  });
});

describe("setFoldersOn", () => {
  it("opens every folder when turned on", () => {
    const s = setFoldersOn(start(), true, ["root", "a", "b"], "root");
    expect(s.foldersOn).toBe(true);
    expect([...s.open].sort()).toEqual(["a", "b", "root"]);
  });

  it("closes back to the root and resets focus when turned off", () => {
    const on = focusOn(setFoldersOn(start(), true, ["root", "a"], "root"), "a");
    const off = setFoldersOn(on, false, ["root", "a"], "root");
    expect(off.foldersOn).toBe(false);
    expect([...off.open]).toEqual(["root"]);
    expect(off.focusRoot).toBe("root");
  });
});

describe("setFilesOn", () => {
  it("turns files on", () => {
    expect(setFilesOn(start(), true).filesOn).toBe(true);
  });

  it("turns files off and forgets per-folder choices", () => {
    const s = setFilesOn(setFilesOn(toggleFilesFor(start(), "a"), true), false);
    expect(s.filesOn).toBe(false);
    expect(s.filesFor.size).toBe(0);
  });
});

describe("focus", () => {
  it("focuses on a folder and opens it", () => {
    const s = focusOn(start(), "a");
    expect(s.focusRoot).toBe("a");
    expect(s.open.has("a")).toBe(true);
  });

  it("resets focus to the root, returning the same object when already there", () => {
    const focused = focusOn(start(), "a");
    expect(resetFocus(focused, "root").focusRoot).toBe("root");
    const plain = start();
    expect(resetFocus(plain, "root")).toBe(plain);
  });
});

describe("setQuery", () => {
  it("stores the text", () => {
    expect(setQuery(start(), "road", "root").query).toBe("road");
  });

  it("leaves focus when the search is non-empty", () => {
    const s = setQuery(focusOn(start(), "a"), "road", "root");
    expect(s.focusRoot).toBe("root");
  });

  it("keeps focus when the search is cleared or blank", () => {
    const s = setQuery(focusOn(start(), "a"), "  ", "root");
    expect(s.focusRoot).toBe("a");
  });
});

describe("setLayout", () => {
  it("switches layout and keeps the same object when unchanged", () => {
    const s = start();
    expect(setLayout(s, "radial").layoutMode).toBe("radial");
    expect(setLayout(s, "vertical")).toBe(s);
  });
});

describe("resetView", () => {
  it("goes back to the start but keeps the layout", () => {
    const messy = setQuery(select(toggleOpen(setLayout(start(), "radial"), "a"), "a"), "x", "root");
    const reset = resetView(messy, "root");
    expect(reset.layoutMode).toBe("radial");
    expect(reset.query).toBe("");
    expect(reset.selected).toBeNull();
    expect([...reset.open]).toEqual(["root"]);
  });
});
