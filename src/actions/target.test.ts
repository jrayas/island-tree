import { describe, expect, it } from "vitest";
import { openTarget } from "./target";

describe("openTarget", () => {
  it("opens a new tab by default", () => {
    expect(openTarget({ ctrlKey: false, metaKey: false })).toBe("tab");
  });

  it("opens a split with Ctrl or Cmd", () => {
    expect(openTarget({ ctrlKey: true, metaKey: false })).toBe("split");
    expect(openTarget({ ctrlKey: false, metaKey: true })).toBe("split");
  });
});
