import { describe, expect, it } from "vitest";
import {
  checkMove,
  countFiles,
  joinPath,
  needsConfirmation,
  parentOf,
  relockDue,
  renamedPath,
  splitExtension,
  uniqueName,
  validateName,
} from "./rules";

describe("parentOf and joinPath", () => {
  it("finds the folder an item is in, with the root for top-level items", () => {
    expect(parentOf("Projects/Plugin/main.ts")).toBe("Projects/Plugin");
    expect(parentOf("Projects")).toBe("/");
    expect(parentOf("/")).toBe("/");
  });

  it("joins a folder and a name, without a leading slash for the root", () => {
    expect(joinPath("Projects", "a.md")).toBe("Projects/a.md");
    expect(joinPath("/", "a.md")).toBe("a.md");
  });
});

describe("splitExtension", () => {
  it("separates the last extension", () => {
    expect(splitExtension("Plan.md")).toEqual({ base: "Plan", extension: ".md" });
    expect(splitExtension("archive.tar.gz")).toEqual({ base: "archive.tar", extension: ".gz" });
  });

  it("treats no dot or a leading dot as no extension", () => {
    expect(splitExtension("Projects")).toEqual({ base: "Projects", extension: "" });
    expect(splitExtension(".hidden")).toEqual({ base: ".hidden", extension: "" });
  });
});

describe("validateName", () => {
  const siblings = ["Plan.md", "Notes", "Daily"];

  it("accepts an ordinary name", () => {
    expect(validateName("Roadmap.md", siblings)).toBeNull();
  });

  it("asks for a name when it is empty or only spaces", () => {
    expect(validateName("", siblings)).toBe("Enter a name.");
    expect(validateName("   ", siblings)).toBe("Enter a name.");
  });

  it("rejects the characters Obsidian does not allow", () => {
    for (const bad of ["a/b", "a\\b", "a:b", "a*b", "a?b", 'a"b', "a<b", "a>b", "a|b", "a\u0007b"]) {
      expect(validateName(bad, siblings)).toContain("cannot contain");
    }
  });

  it("rejects a leading dot and a trailing dot or space", () => {
    expect(validateName(".secret", siblings)).toContain("start with a dot");
    expect(validateName("Plan.", siblings)).toContain("end with a dot");
    expect(validateName("Plan ", siblings)).toContain("end with a dot");
  });

  it("rejects an overlong name", () => {
    expect(validateName("a".repeat(256), siblings)).toBe("That name is too long.");
  });

  it("rejects a name already used next to it, ignoring case", () => {
    expect(validateName("plan.MD", siblings)).toContain("already exists");
    expect(validateName("notes", siblings)).toContain("already exists");
  });

  it("lets an item keep or re-case its own name", () => {
    expect(validateName("Plan.md", siblings, "Plan.md")).toBeNull();
    expect(validateName("PLAN.md", siblings, "Plan.md")).toBeNull();
  });
});

describe("renamedPath", () => {
  it("keeps a file's extension and its folder", () => {
    expect(renamedPath("Projects/Plan.md", "Roadmap", "file")).toBe("Projects/Roadmap.md");
    expect(renamedPath("Plan.md", "Roadmap", "file")).toBe("Roadmap.md");
  });

  it("renames a folder without adding an extension", () => {
    expect(renamedPath("Projects/v1.0", "v2", "folder")).toBe("Projects/v2");
  });
});

describe("uniqueName", () => {
  it("uses the base name when it is free", () => {
    expect(uniqueName("Untitled", ".md", ["Other.md"])).toBe("Untitled");
  });

  it("numbers it when taken, ignoring case", () => {
    expect(uniqueName("Untitled", ".md", ["Untitled.md"])).toBe("Untitled 1");
    expect(uniqueName("Untitled", ".md", ["untitled.md", "Untitled 1.md", "Untitled 2.md"])).toBe("Untitled 3");
  });

  it("works for folders with no extension", () => {
    expect(uniqueName("New folder", "", ["New folder"])).toBe("New folder 1");
  });
});

describe("checkMove", () => {
  const source = { path: "Projects/Plan.md", name: "Plan.md" };

  it("allows a move to a different folder", () => {
    expect(checkMove(source, "Archive", ["Old.md"])).toEqual({ ok: true });
  });

  it("refuses the folder it is already in", () => {
    expect(checkMove(source, "Projects", [])).toEqual({ ok: false, reason: "It is already in that folder." });
  });

  it("refuses a move into itself or its own descendant", () => {
    const folder = { path: "Projects", name: "Projects" };
    expect(checkMove(folder, "Projects", [])).toEqual({ ok: false, reason: "A folder cannot be moved into itself." });
    expect(checkMove(folder, "Projects/Plugin", [])).toEqual({
      ok: false,
      reason: "A folder cannot be moved into one of its own subfolders.",
    });
  });

  it("does not mistake a folder with a similar name for a descendant", () => {
    expect(checkMove({ path: "Pro", name: "Pro" }, "Projects", [])).toEqual({ ok: true });
  });

  it("refuses a clashing name, ignoring case", () => {
    const result = checkMove(source, "Archive", ["plan.md"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("already a file or folder called");
  });

  it("refuses to move the vault", () => {
    expect(checkMove({ path: "/", name: "Vault" }, "Projects", [])).toEqual({
      ok: false,
      reason: "The vault itself cannot be moved.",
    });
  });
});

describe("needsConfirmation", () => {
  it("asks only above the threshold", () => {
    expect(needsConfirmation(5, 5)).toBe(false);
    expect(needsConfirmation(6, 5)).toBe(true);
  });
});

describe("relockDue", () => {
  const minute = 60_000;

  it("is due once the idle time reaches the limit", () => {
    expect(relockDue(0, 4 * minute, 5)).toBe(false);
    expect(relockDue(0, 5 * minute, 5)).toBe(true);
  });

  it("never locks when the setting is 0", () => {
    expect(relockDue(0, 10_000 * minute, 0)).toBe(false);
  });
});

describe("countFiles", () => {
  const file = { kind: "file", children: [] };
  const folder = (...children: { kind: string; children: never[] | unknown[] }[]) => ({ kind: "folder", children });

  it("counts files at every depth and ignores folders", () => {
    const tree = folder(file, folder(file, file, folder(file)), folder());
    expect(countFiles(tree as never)).toBe(4);
  });

  it("counts a single file as one and an empty folder as none", () => {
    expect(countFiles(file)).toBe(1);
    expect(countFiles(folder() as never)).toBe(0);
  });
});
