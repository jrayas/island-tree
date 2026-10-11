import { describe, expect, it } from "vitest";
import { describeForReader, describeItem } from "./display";
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
  return { open: new Set(open), batches: new Map(), filesFor: new Set(), filesOn };
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

  it("takes a folder's counts from the cache when given, and adds the totals to the tooltip", () => {
    const tree = buildVisibleTree(root, state([root.uid]));
    const card = describeItem(tree.children[0], state([root.uid]), null, { tags: true }, {
      folders: 4,
      files: 7,
      total: { folders: 9, files: 120 },
    });
    expect(card).toMatchObject({ subfolders: 4, files: 7, total: { folders: 9, files: 120 } });
    expect(card.tooltip).toBe("Notes: 4 folders, 7 files (files hidden); 120 files and 9 folders in all");
  });

  it("leaves the totals out until the whole-vault count has reached the folder", () => {
    const tree = buildVisibleTree(root, state([root.uid]));
    const card = describeItem(tree.children[0], state([root.uid]), null, { tags: true }, { folders: 1, files: 1, total: null });
    expect(card.total).toBeNull();
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

  it("adds age, size, links, tags and status to a file's tooltip when details are known", () => {
    const s = state([root.uid], true);
    const tree = buildVisibleTree(root, s);
    const pdf = tree.children.find((c) => c.node?.name === "spec.pdf")!;
    const meta = {
      recency: "week" as const,
      age: "3d ago",
      size: "2.0 KB",
      links: 1,
      outgoing: 1,
      incoming: 0,
      tags: ["#plan", "#web"],
      status: "review",
      statusKind: "review" as const,
      modified: "5 Oct 2026",
    };
    expect(describeItem(pdf, s, meta).tooltip).toBe(
      "spec.pdf (PDF) | 3d ago | 2.0 KB | 1 link | #plan #web | status: review",
    );
  });

  it("leaves tags out of the tooltip when they are switched off", () => {
    const s = state([root.uid], true);
    const tree = buildVisibleTree(root, s);
    const pdf = tree.children.find((c) => c.node?.name === "spec.pdf")!;
    const meta = {
      recency: "today" as const, age: "today", size: "1 B", links: 0, outgoing: 0, incoming: 0,
      tags: ["#plan"], status: null, statusKind: "other" as const, modified: "8 Oct 2026",
    };
    expect(describeItem(pdf, s, meta, { tags: false }).tooltip).not.toContain("#plan");
    expect(describeItem(pdf, s, meta, { tags: true }).tooltip).toContain("#plan");
  });

  it("reports a folder's total item count", () => {
    const s = state([root.uid]);
    const tree = buildVisibleTree(root, s);
    expect(describeItem(tree.children[0], s).items).toBe(2);
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
    expect(describeItem(pill, s).tooltip).toBe("Show more (2 items hidden)");
  });

  it("describes a capped pill as an inert note about what is left out", () => {
    const pill = {
      id: "more:x",
      kind: "more" as const,
      node: null,
      hidden: 120,
      capped: true,
      parentId: "x",
      children: [],
    };
    const shown = describeItem(pill, state([]));
    expect(shown.label).toBe("120 not shown");
    expect(shown.tooltip).toContain("Search to find them");
    expect(shown.tooltip).toContain("at most 1000");
    expect(shown.capped).toBe(true);
  });

  it("says what a screen reader needs for each kind of card", () => {
    const base = { icon: null, colour: null, items: 0, filesShown: false, tooltip: "" };
    expect(
      describeForReader({ ...base, kind: "folder", label: "Projects", subfolders: 2, files: 1, isOpen: true }),
    ).toBe("Projects, folder, open, 2 folders and 1 file");
    expect(
      describeForReader({ ...base, kind: "folder", label: "Daily", subfolders: 0, files: 9, isOpen: false }),
    ).toBe("Daily, folder, closed, 0 folders and 9 files");
    expect(describeForReader({ ...base, kind: "file", label: "roadmap.md", subfolders: 0, files: 0, isOpen: false })).toBe(
      "roadmap.md, file",
    );
  });

  it("adds the total to a folder's reading once it is known", () => {
    const base = { icon: null, colour: null, items: 0, filesShown: false, tooltip: "", kind: "folder" as const, label: "Projects", subfolders: 2, files: 1, isOpen: false };
    expect(describeForReader({ ...base, total: { folders: 5, files: 340 } })).toBe(
      "Projects, folder, closed, 2 folders and 1 file, 340 files in all",
    );
  });

  it("groups thousands, and does not repeat the count when nothing is nested deeper", () => {
    const base = { icon: null, colour: null, items: 0, filesShown: false, tooltip: "", kind: "folder" as const, label: "articles", isOpen: true };
    expect(describeForReader({ ...base, subfolders: 125, files: 0, total: { folders: 719, files: 15101 } })).toBe(
      "articles, folder, open, 125 folders and 0 files, 15,101 files in all",
    );
    expect(describeForReader({ ...base, label: "Inbox", isOpen: false, subfolders: 0, files: 4, total: { folders: 0, files: 4 } })).toBe(
      "Inbox, folder, closed, 0 folders and 4 files",
    );
  });

  it("tells a screen reader how to use a pill, and when it does nothing", () => {
    const base = { icon: null, colour: null, items: 0, filesShown: false, kind: "more" as const, subfolders: 0, files: 0, isOpen: false };
    expect(describeForReader({ ...base, label: "+3 more", tooltip: "Show more (3 items hidden)" })).toBe(
      "+3 more. Press Enter to show more.",
    );
    expect(describeForReader({ ...base, label: "120 not shown", tooltip: "120 more items not shown. Search to find them.", capped: true })).toBe(
      "120 not shown. 120 more items not shown. Search to find them.",
    );
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
    expect(describeItem(pill, s).tooltip).toBe("Show more (1 item hidden)");
  });
});
