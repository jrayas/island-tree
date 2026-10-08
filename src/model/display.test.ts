import { describe, expect, it } from "vitest";
import { describeItem } from "./display";
import { UidRegistry, buildTree } from "./tree";
import { buildVisibleTree, visibleChildren, type VisibilityState } from "./visibility";

const root = buildTree(
  {
    name: "Vault",
    path: "/",
    children: [
      {
        name: "Notes",
        path: "/Notes",
        children: [
          { name: "a.md", path: "/Notes/a.md" },
          { name: "Sub", path: "/Notes/Sub", children: [] },
        ],
      },
      { name: "spec.pdf", path: "/spec.pdf" },
    ],
  },
  new UidRegistry(),
);

const notes = root.children[0];

function state(open: string[], filesOn = false): VisibilityState {
  return { open: new Set(open), showAll: new Set(), filesFor: new Set(), filesOn };
}

describe("describeItem", () => {
  it("describes a closed folder with its subfolder and file counts", () => {
    const tree = buildVisibleTree(root, state([root.uid]));
    const card = describeItem(tree.children[0], state([root.uid]));
    expect(card).toMatchObject({
      kind: "folder",
      label: "Notes",
      icon: "folder",
      subfolders: 1,
      files: 1,
      isOpen: false,
      filesShown: false,
    });
    expect(card.tooltip).toBe("Notes: 1 folder, 1 file (files hidden)");
  });

  it("uses the open icon and reports shown files for an open folder", () => {
    const s = state([root.uid, notes.uid], true);
    const tree = buildVisibleTree(root, s);
    const card = describeItem(tree.children[0], s);
    expect(card.icon).toBe("folder-open");
    expect(card.isOpen).toBe(true);
    expect(card.tooltip).toContain("files shown");
  });

  it("describes a file with its category icon and theme colour", () => {
    const s = state([root.uid], true);
    const tree = buildVisibleTree(root, s);
    const pdf = tree.children.find((c) => c.node?.name === "spec.pdf")!;
    const card = describeItem(pdf, s);
    expect(card).toMatchObject({ kind: "file", label: "spec.pdf", colour: "var(--color-red)" });
    expect(card.tooltip).toBe("spec.pdf (PDF)");
  });

  it("describes a pill with the hidden count and no icon", () => {
    const many = buildTree(
      {
        name: "V",
        path: "/",
        children: Array.from({ length: 8 }, (_, i) => ({ name: `f${i}`, path: `/f${i}`, children: [] })),
      },
      new UidRegistry(),
    );
    const s = state([many.uid]);
    const pill = visibleChildren(many, s, 6).at(-1)!;
    expect(describeItem(pill, s)).toMatchObject({ kind: "more", label: "+2 more", icon: null });
    expect(describeItem(pill, s).tooltip).toBe("Show 2 more items");
  });

  it("uses the singular for one hidden item", () => {
    const many = buildTree(
      {
        name: "V",
        path: "/",
        children: Array.from({ length: 7 }, (_, i) => ({ name: `f${i}`, path: `/f${i}`, children: [] })),
      },
      new UidRegistry(),
    );
    const s = state([many.uid]);
    const pill = visibleChildren(many, s, 6).at(-1)!;
    expect(describeItem(pill, s).tooltip).toBe("Show 1 more item");
  });
});
