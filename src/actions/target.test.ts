import { describe, expect, it } from "vitest";
import { openTarget, resolveTarget } from "./target";

const plain = { ctrlKey: false, metaKey: false };

describe("openTarget", () => {
  it("opens a new tab by default", () => {
    expect(openTarget(plain)).toBe("tab");
  });

  it("opens a split with Ctrl or Cmd", () => {
    expect(openTarget({ ctrlKey: true, metaKey: false })).toBe("split");
    expect(openTarget({ ctrlKey: false, metaKey: true })).toBe("split");
  });

  it("follows the Open notes in setting", () => {
    expect(openTarget(plain, "tab")).toBe("tab");
    expect(openTarget(plain, "this")).toBe("this");
    expect(openTarget(plain, "split")).toBe("split");
  });

  it("still opens a split with Ctrl or Cmd whatever the setting says", () => {
    expect(openTarget({ ctrlKey: true, metaKey: false }, "this")).toBe("split");
    expect(openTarget({ ctrlKey: false, metaKey: true }, "tab")).toBe("split");
  });
});

describe("resolveTarget", () => {
  it("replaces the dashboard's own tab in the main area", () => {
    expect(resolveTarget("this", false)).toBe("this");
  });

  it("uses a new tab instead in a sidebar, so the panel is not swapped for a note", () => {
    expect(resolveTarget("this", true)).toBe("tab");
  });

  it("leaves the other targets alone", () => {
    expect(resolveTarget("tab", true)).toBe("tab");
    expect(resolveTarget("split", true)).toBe("split");
  });
});
