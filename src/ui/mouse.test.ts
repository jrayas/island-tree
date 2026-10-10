import { describe, expect, it } from "vitest";
import { PAN_BUTTONS, isFitShortcut, keyBelongsElsewhere, wheelOptions, zoomKeys, type KeyPress } from "./mouse";

describe("wheelOptions", () => {
  it("pans on scroll by default, as in Canvas", () => {
    expect(wheelOptions("pan")).toEqual({ panOnScroll: true, zoomOnScroll: false });
  });

  it("zooms on scroll when chosen", () => {
    expect(wheelOptions("zoom")).toEqual({ panOnScroll: false, zoomOnScroll: true });
  });
});

describe("pan and zoom keys", () => {
  it("pans with the left, middle and right buttons", () => {
    expect(PAN_BUTTONS).toEqual([0, 1, 2]);
  });

  it("zooms with Ctrl, Cmd or Space held while the wheel pans", () => {
    expect(zoomKeys("pan")).toEqual(["Control", "Meta", " "]);
  });

  it("leaves Space to pan while the wheel zooms", () => {
    expect(zoomKeys("zoom")).toEqual(["Control", "Meta"]);
  });
});

describe("keyBelongsElsewhere", () => {
  const target = (matches: boolean) => ({ closest: () => (matches ? {} : null) });

  it("leaves keys alone when the target is a box, button or dialog", () => {
    expect(keyBelongsElsewhere(target(true))).toBe(true);
  });

  it("claims keys pressed over plain content", () => {
    expect(keyBelongsElsewhere(target(false))).toBe(false);
  });

  it("claims keys with no usable target", () => {
    expect(keyBelongsElsewhere(null)).toBe(false);
    expect(keyBelongsElsewhere({} as never)).toBe(false);
  });
});

describe("isFitShortcut", () => {
  const press = (over: Partial<KeyPress>): KeyPress => ({
    code: "Digit1",
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...over,
  });

  it("is Shift and 1", () => {
    expect(isFitShortcut(press({}))).toBe(true);
  });

  it("needs Shift, and no other modifier", () => {
    expect(isFitShortcut(press({ shiftKey: false }))).toBe(false);
    expect(isFitShortcut(press({ ctrlKey: true }))).toBe(false);
    expect(isFitShortcut(press({ metaKey: true }))).toBe(false);
    expect(isFitShortcut(press({ altKey: true }))).toBe(false);
  });

  it("needs the 1 key", () => {
    expect(isFitShortcut(press({ code: "Digit2" }))).toBe(false);
  });
});
