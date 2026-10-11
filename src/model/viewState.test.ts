import { describe, expect, it } from "vitest";
import {
  createViewState,
  focusOn,
  resetFocus,
  initialViewState,
  restartView,
  select,
  setFilesOn,
  setDetail,
  collapseFolders,
  expandLevel,
  setLayout,
  setQuery,
  revealBatch,
  showFolderContents,
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
    expect(s.detail).toBe(false);
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

describe("revealBatch", () => {
  it("records a revealed batch for the folder", () => {
    expect(revealBatch(start(), "a", 2).batches.get("a")?.has(2)).toBe(true);
  });

  it("keeps earlier batches when another is revealed", () => {
    const s = revealBatch(revealBatch(start(), "a", 1), "a", 3);
    expect([...(s.batches.get("a") ?? [])].sort()).toEqual([1, 3]);
  });

  it("changes nothing for batch 0, which is always shown, or one already revealed", () => {
    const s = start();
    expect(revealBatch(s, "a", 0)).toBe(s);
    const once = revealBatch(s, "a", 1);
    expect(revealBatch(once, "a", 1)).toBe(once);
  });

  it("does not change the state it was given", () => {
    const s = start();
    revealBatch(s, "a", 1);
    expect(s.batches.size).toBe(0);
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

describe("expandLevel and collapseFolders", () => {
  it("opens the folders on screen and marks Expand folders on", () => {
    const s = expandLevel(start(), ["a", "b"]);
    expect(s.foldersOn).toBe(true);
    expect([...s.open].sort()).toEqual(["a", "b", "root"]);
  });

  it("goes one level deeper each time, keeping what was open", () => {
    const first = expandLevel(start(), ["a"]);
    const second = expandLevel(first, ["c", "d"]);
    expect([...second.open].sort()).toEqual(["a", "c", "d", "root"]);
  });

  it("does not open anything else, and does not change the state it was given", () => {
    const s = start();
    expandLevel(s, ["a"]);
    expect([...s.open]).toEqual(["root"]);
  });

  it("closes back to the root and resets focus", () => {
    const on = focusOn(expandLevel(start(), ["a"]), "a");
    const off = collapseFolders({ ...on, pinned: new Set(["p"]) }, "root");
    expect(off.pinned.size).toBe(0);
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
    expect(setQuery(start(), "road").query).toBe("road");
  });

  it("only marks cards on screen, so it keeps the focus, whatever is typed", () => {
    expect(setQuery(focusOn(start(), "a"), "road").focusRoot).toBe("a");
    expect(setQuery(focusOn(start(), "a"), "  ").focusRoot).toBe("a");
  });

  it("returns the same state when the text has not changed", () => {
    const s = start();
    expect(setQuery(s, s.query)).toBe(s);
  });
});

describe("setLayout", () => {
  it("switches layout and keeps the same object when unchanged", () => {
    const s = start();
    expect(setLayout(s, "radial").layoutMode).toBe("radial");
    expect(setLayout(s, "vertical")).toBe(s);
  });
});

describe("setDetail", () => {
  it("switches detail on and keeps the same object when unchanged", () => {
    const s = start();
    expect(setDetail(s, true).detail).toBe(true);
    expect(setDetail(s, false)).toBe(s);
  });
});

describe("initialViewState", () => {
  const folders = ["a", "b"];

  it("starts plain by default", () => {
    const s = initialViewState("root", folders, {
      layoutMode: "vertical", detail: false, expandFolders: false, expandFiles: false,
    });
    expect(s).toEqual(createViewState("root"));
  });

  it("follows the start settings", () => {
    const s = initialViewState("root", folders, {
      layoutMode: "radial", detail: true, expandFolders: true, expandFiles: true,
    });
    expect(s.layoutMode).toBe("radial");
    expect(s.detail).toBe(true);
    expect(s.filesOn).toBe(true);
    expect(s.foldersOn).toBe(true);
    // The first level only: the vault and its folders, not everything below.
    expect([...s.open].sort()).toEqual(["a", "b", "root"]);
  });

  it("does not open folders below the first level", () => {
    const s = initialViewState("root", ["a"], {
      layoutMode: "vertical", detail: false, expandFolders: true, expandFiles: false,
    });
    expect(s.open.has("deep")).toBe(false);
  });
});

describe("restartView", () => {
  it("goes back to the starting view but keeps the layout and detail level chosen since", () => {
    const initial = initialViewState("root", ["a"], {
      layoutMode: "vertical", detail: false, expandFolders: true, expandFiles: false,
    });
    const messy = setQuery(select(toggleOpen(setDetail(setLayout(initial, "radial"), true), "a"), "a"), "x");
    const reset = restartView(messy, initial);
    expect(reset.layoutMode).toBe("radial");
    expect(reset.detail).toBe(true);
    expect(reset.query).toBe("");
    expect(reset.selected).toBeNull();
    expect([...reset.open].sort()).toEqual(["a", "root"]);
  });
});

describe("showFolderContents", () => {
  it("opens the folder and shows its files", () => {
    const s = showFolderContents(start(), "a");
    expect(s.open.has("a")).toBe(true);
    expect(s.filesFor.has("a")).toBe(true);
  });

  it("does nothing the second time, unlike a toggle", () => {
    const once = showFolderContents(start(), "a");
    const twice = showFolderContents(once, "a");
    expect(twice.open).toEqual(once.open);
    expect(twice.filesFor).toEqual(once.filesFor);
  });

  it("leaves everything else alone", () => {
    const s = showFolderContents(start(), "a");
    expect(s.selected).toBe(start().selected);
    expect(s.layoutMode).toBe(start().layoutMode);
  });
});
