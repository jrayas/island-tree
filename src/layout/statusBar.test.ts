import { describe, expect, it } from "vitest";
import { STATUS_BAR_BREATHING_ROOM, statusBarClearance, type Box } from "./statusBar";

const view: Box = { left: 0, top: 0, right: 900, bottom: 600 };

describe("statusBarClearance", () => {
  it("is 0 when there is no status bar", () => {
    expect(statusBarClearance(view, null, 24)).toBe(0);
  });

  it("is 0 when the status bar is not rendered", () => {
    expect(statusBarClearance(view, { left: 0, top: 0, right: 0, bottom: 0 }, 24)).toBe(0);
  });

  it("clears a floating bar in the bottom-right corner, with a little room", () => {
    const bar: Box = { left: 740, top: 573, right: 900, bottom: 600 };
    expect(statusBarClearance(view, bar, 24)).toBe(27 + STATUS_BAR_BREATHING_ROOM);
  });

  it("is 0 when the bar is in a different part of the window", () => {
    const elsewhere: Box = { left: 900, top: 573, right: 1100, bottom: 600 };
    expect(statusBarClearance(view, elsewhere, 24)).toBe(0);
  });

  it("is 0 when the bar is below the view", () => {
    expect(statusBarClearance(view, { left: 740, top: 600, right: 900, bottom: 627 }, 24)).toBe(0);
  });

  it("is 0 when the bar only reaches the corner inside the right inset", () => {
    expect(statusBarClearance(view, { left: 880, top: 573, right: 900, bottom: 600 }, 24)).toBe(0);
  });

  it("follows the bar's height when it grows", () => {
    const tall: Box = { left: 700, top: 560, right: 900, bottom: 600 };
    expect(statusBarClearance(view, tall, 24)).toBe(40 + STATUS_BAR_BREATHING_ROOM);
  });
});
