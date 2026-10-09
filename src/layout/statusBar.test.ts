import { describe, expect, it } from "vitest";
import { STATUS_BAR_BREATHING_ROOM, statusBarClearance, type Box } from "./statusBar";

const view: Box = { left: 0, top: 0, right: 900, bottom: 600 };
const bar: Box = { left: 740, top: 573, right: 900, bottom: 600 };
// Text at the bottom left: 24px in, 300px wide.
const text = { left: 24, right: 324 };

describe("statusBarClearance", () => {
  it("is 0 when there is no status bar", () => {
    expect(statusBarClearance(view, null, text)).toBe(0);
  });

  it("is 0 when the status bar is not rendered", () => {
    expect(statusBarClearance(view, { left: 0, top: 0, right: 0, bottom: 0 }, text)).toBe(0);
  });

  it("is 0 when the text is empty or unknown", () => {
    expect(statusBarClearance(view, bar, null)).toBe(0);
    expect(statusBarClearance(view, bar, { left: 24, right: 24 })).toBe(0);
  });

  it("is 0 when the bar is beside the text, as in a wide pane", () => {
    expect(statusBarClearance(view, bar, text)).toBe(0);
  });

  it("clears the bar, with a little room, when the text reaches it", () => {
    const wide = { left: 24, right: 800 };
    expect(statusBarClearance(view, bar, wide)).toBe(27 + STATUS_BAR_BREATHING_ROOM);
  });

  it("is 0 when the bar is in a different part of the window", () => {
    const elsewhere: Box = { left: 900, top: 573, right: 1100, bottom: 600 };
    expect(statusBarClearance(view, elsewhere, { left: 24, right: 880 })).toBe(0);
  });

  it("is 0 when the bar is below the view", () => {
    const below: Box = { left: 740, top: 600, right: 900, bottom: 627 };
    expect(statusBarClearance(view, below, { left: 24, right: 880 })).toBe(0);
  });

  it("follows the bar's height when it grows", () => {
    const tall: Box = { left: 700, top: 560, right: 900, bottom: 600 };
    expect(statusBarClearance(view, tall, { left: 24, right: 880 })).toBe(40 + STATUS_BAR_BREATHING_ROOM);
  });
});
