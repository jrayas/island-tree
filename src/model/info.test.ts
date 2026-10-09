import { describe, expect, it } from "vitest";
import { describeSelection, pathLabel } from "./info";
import { UidRegistry, buildTree } from "./tree";

const root = buildTree(
  {
    name: "My vault",
    path: "/",
    children: [
      {
        name: "Projects",
        path: "/Projects",
        children: [
          { name: "Plugin", path: "/Projects/Plugin", children: [] },
          { name: "plan.md", path: "/Projects/plan.md" },
          { name: "spec.pdf", path: "/Projects/spec.pdf" },
        ],
      },
    ],
  },
  new UidRegistry(),
);
const projects = root.children[0];
const plan = projects.children.find((c) => c.name === "plan.md");

describe("pathLabel", () => {
  it("joins the names from the vault root with slashes", () => {
    expect(pathLabel(plan!)).toBe("My vault / Projects / plan.md");
    expect(pathLabel(root)).toBe("My vault");
  });
});

describe("describeSelection", () => {
  it("returns null when nothing is selected", () => {
    expect(describeSelection(null)).toBeNull();
  });

  it("describes a folder with its counts", () => {
    expect(describeSelection(projects)).toEqual({
      title: "Projects",
      path: "My vault / Projects",
      details: ["Folder", "1 subfolder, 2 files"],
    });
  });

  it("adds modified date, size, links, tags and status for a file with details", () => {
    const meta = {
      recency: "today" as const,
      age: "today",
      size: "1.5 KB",
      links: 3,
      outgoing: 2,
      incoming: 1,
      tags: ["#plan"],
      status: "draft",
      statusKind: "other" as const,
      modified: "8 Oct 2026",
    };
    expect(describeSelection(plan!, meta)?.details).toEqual([
      "Markdown note",
      "Modified 8 Oct 2026 (today)",
      "Size 1.5 KB",
      "2 links out, 1 backlink",
      "Tags: #plan",
      "Status: draft",
    ]);
  });

  it("leaves tags out when they are switched off", () => {
    const meta = {
      recency: "today" as const, age: "today", size: "1 B", links: 0, outgoing: 0, incoming: 0,
      tags: ["#plan"], status: null, statusKind: "other" as const, modified: "8 Oct 2026",
    };
    const lines = describeSelection(plan!, meta, { tags: false })?.details ?? [];
    expect(lines.some((l) => l.startsWith("Tags"))).toBe(false);
  });

  it("leaves out tags and status when there are none", () => {
    const meta = {
      recency: "older" as const,
      age: "20d ago",
      size: "10 B",
      links: 0,
      outgoing: 0,
      incoming: 0,
      tags: [],
      status: null,
      statusKind: "other" as const,
      modified: "1 Sep 2026",
    };
    const lines = describeSelection(plan!, meta)?.details ?? [];
    expect(lines.some((l) => l.startsWith("Tags"))).toBe(false);
    expect(lines.some((l) => l.startsWith("Status"))).toBe(false);
    expect(lines).toContain("0 links out, 0 backlinks");
  });

  it("describes a file with its type", () => {
    expect(describeSelection(plan!)?.details).toEqual(["Markdown note"]);
    const pdf = projects.children.find((c) => c.name === "spec.pdf");
    expect(describeSelection(pdf!)?.details).toEqual(["PDF"]);
  });
});
