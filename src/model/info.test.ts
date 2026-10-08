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

  it("describes a file with its type", () => {
    expect(describeSelection(plan!)?.details).toEqual(["Markdown note"]);
    const pdf = projects.children.find((c) => c.name === "spec.pdf");
    expect(describeSelection(pdf!)?.details).toEqual(["PDF"]);
  });
});
