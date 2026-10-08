import { describe, expect, it } from "vitest";
import { CATEGORY_STYLES, extensionOf, fileCategory } from "./fileType";

describe("extensionOf", () => {
  it("returns the lower-case extension", () => {
    expect(extensionOf("Note.MD")).toBe("md");
    expect(extensionOf("archive.tar.gz")).toBe("gz");
  });

  it("returns an empty string when there is no usable extension", () => {
    expect(extensionOf("README")).toBe("");
    expect(extensionOf(".gitignore")).toBe("");
    expect(extensionOf("trailing.")).toBe("");
  });
});

describe("fileCategory", () => {
  it.each([
    ["note.md", "markdown"],
    ["main.ts", "code"],
    ["data.json", "code"],
    ["theme.css", "code"],
    ["photo.PNG", "image"],
    ["logo.svg", "image"],
    ["spec.pdf", "pdf"],
    ["map.canvas", "canvas"],
    ["notes.txt", "other"],
    ["README", "other"],
  ])("puts %s in %s", (name, category) => {
    expect(fileCategory(name)).toBe(category);
  });
});

describe("CATEGORY_STYLES", () => {
  it("uses only theme variables for colour so both themes work", () => {
    for (const style of Object.values(CATEGORY_STYLES)) {
      expect(style.colour).toMatch(/^var\(--[a-z-]+\)$/);
    }
  });
});
