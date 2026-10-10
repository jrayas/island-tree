import { describe, expect, it } from "vitest";
import { NAV_KEYS, navigate, type NavItem } from "./keyNav";

// Vault
//   Projects (open)
//     Plugin (closed)
//     roadmap.md
//   Daily (closed)
//   +2 more
const items: NavItem[] = [
  { id: "vault", kind: "folder", parentId: null, isOpen: true },
  { id: "projects", kind: "folder", parentId: "vault", isOpen: true },
  { id: "plugin", kind: "folder", parentId: "projects", isOpen: false },
  { id: "roadmap", kind: "file", parentId: "projects", isOpen: false },
  { id: "daily", kind: "folder", parentId: "vault", isOpen: false },
  { id: "more:vault", kind: "more", parentId: "vault", isOpen: false },
];

describe("navigate: moving through the cards", () => {
  it("moves down and up in reading order", () => {
    expect(navigate("ArrowDown", items, "projects")).toEqual({ type: "select", id: "plugin" });
    expect(navigate("ArrowUp", items, "roadmap")).toEqual({ type: "select", id: "plugin" });
  });

  it("stops at the ends", () => {
    expect(navigate("ArrowUp", items, "vault")).toBeNull();
    expect(navigate("ArrowDown", items, "more:vault")).toBeNull();
  });

  it("jumps to the first and last card", () => {
    expect(navigate("Home", items, "daily")).toEqual({ type: "select", id: "vault" });
    expect(navigate("End", items, "vault")).toEqual({ type: "select", id: "more:vault" });
  });

  it("lands on a pill, so the keyboard can expand it", () => {
    expect(navigate("ArrowDown", items, "daily")).toEqual({ type: "select", id: "more:vault" });
  });
});

describe("navigate: opening and closing", () => {
  it("opens a closed folder with Right", () => {
    expect(navigate("ArrowRight", items, "plugin")).toEqual({ type: "open", id: "plugin" });
  });

  it("steps into an open folder with Right", () => {
    expect(navigate("ArrowRight", items, "projects")).toEqual({ type: "select", id: "plugin" });
  });

  it("does nothing on Right for a file or a pill", () => {
    expect(navigate("ArrowRight", items, "roadmap")).toBeNull();
    expect(navigate("ArrowRight", items, "more:vault")).toBeNull();
  });

  it("does nothing on Right for an open folder with nothing inside", () => {
    const empty: NavItem[] = [
      { id: "vault", kind: "folder", parentId: null, isOpen: true },
      { id: "none", kind: "folder", parentId: "vault", isOpen: true },
    ];
    expect(navigate("ArrowRight", empty, "none")).toBeNull();
  });

  it("closes an open folder with Left", () => {
    expect(navigate("ArrowLeft", items, "projects")).toEqual({ type: "close", id: "projects" });
  });

  it("steps out to the parent with Left from a file, a closed folder or a pill", () => {
    expect(navigate("ArrowLeft", items, "roadmap")).toEqual({ type: "select", id: "projects" });
    expect(navigate("ArrowLeft", items, "plugin")).toEqual({ type: "select", id: "projects" });
    expect(navigate("ArrowLeft", items, "more:vault")).toEqual({ type: "select", id: "vault" });
  });

  it("never closes the vault card itself", () => {
    expect(navigate("ArrowLeft", items, "vault")).toBeNull();
  });
});

describe("navigate: Enter and the starting point", () => {
  it("activates the selected card", () => {
    expect(navigate("Enter", items, "roadmap")).toEqual({ type: "activate", id: "roadmap" });
    expect(navigate("Enter", items, "more:vault")).toEqual({ type: "activate", id: "more:vault" });
  });

  it("starts from the first card going forwards and the last going backwards", () => {
    expect(navigate("ArrowDown", items, null)).toEqual({ type: "select", id: "vault" });
    expect(navigate("Home", items, null)).toEqual({ type: "select", id: "vault" });
    expect(navigate("ArrowUp", items, null)).toEqual({ type: "select", id: "more:vault" });
    expect(navigate("End", items, null)).toEqual({ type: "select", id: "more:vault" });
  });

  it("does nothing on Enter or Left with nothing selected", () => {
    expect(navigate("Enter", items, null)).toBeNull();
    expect(navigate("ArrowLeft", items, null)).toBeNull();
  });

  it("starts again when the selected card is no longer shown", () => {
    expect(navigate("ArrowDown", items, "gone")).toEqual({ type: "select", id: "vault" });
  });
});

describe("navigate: other keys", () => {
  it("ignores keys it does not own", () => {
    expect(navigate("a", items, "vault")).toBeNull();
    expect(navigate(" ", items, "vault")).toBeNull();
    expect(navigate("Tab", items, "vault")).toBeNull();
  });

  it("does nothing with no cards", () => {
    expect(navigate("ArrowDown", [], null)).toBeNull();
  });

  it("lists exactly the keys it handles", () => {
    expect([...NAV_KEYS].sort()).toEqual(["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "End", "Enter", "Home"]);
  });
});
