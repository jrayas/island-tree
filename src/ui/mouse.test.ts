import { describe, expect, it } from "vitest";
import {
  PAN_BUTTONS,
  autoScrollKey,
  isFitShortcut,
  isShiftArrow,
  keyBelongsElsewhere,
  wheelOptions,
  zoomKeys,
  type KeyPress,
} from "./mouse";

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

describe("auto-scroll keys", () => {
  const press = (over: Partial<KeyPress & { key: string }>): KeyPress & { key: string } => ({
    key: " ",
    code: "Space",
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...over,
  });

  it("starts or pauses with Shift and Space", () => {
    expect(autoScrollKey(press({}))).toEqual({ type: "toggle" });
  });

  it("points and starts with Shift and an arrow", () => {
    expect(autoScrollKey(press({ key: "ArrowDown", code: "ArrowDown" }))).toEqual({ type: "go", direction: "down" });
    expect(autoScrollKey(press({ key: "ArrowUp", code: "ArrowUp" }))).toEqual({ type: "go", direction: "up" });
    expect(autoScrollKey(press({ key: "ArrowLeft", code: "ArrowLeft" }))).toEqual({ type: "go", direction: "left" });
    expect(autoScrollKey(press({ key: "ArrowRight", code: "ArrowRight" }))).toEqual({ type: "go", direction: "right" });
  });

  it("leaves plain Space and plain arrows alone", () => {
    expect(autoScrollKey(press({ shiftKey: false }))).toBeNull();
    expect(autoScrollKey(press({ shiftKey: false, key: "ArrowDown", code: "ArrowDown" }))).toBeNull();
  });

  it("leaves Ctrl, Cmd and Alt combinations alone", () => {
    for (const over of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      expect(autoScrollKey(press(over))).toBeNull();
      expect(autoScrollKey(press({ ...over, key: "ArrowDown", code: "ArrowDown" }))).toBeNull();
    }
  });

  it("ignores other keys with Shift", () => {
    expect(autoScrollKey(press({ key: "a", code: "KeyA" }))).toBeNull();
    expect(autoScrollKey(press({ key: "1", code: "Digit1" }))).toBeNull();
  });

  it("knows a Shift and arrow press, so the tree can leave it to auto-scroll", () => {
    expect(isShiftArrow(press({ key: "ArrowDown", code: "ArrowDown" }))).toBe(true);
    expect(isShiftArrow(press({ key: "ArrowDown", code: "ArrowDown", shiftKey: false }))).toBe(false);
    expect(isShiftArrow(press({ key: "ArrowDown", code: "ArrowDown", ctrlKey: true }))).toBe(false);
    expect(isShiftArrow(press({}))).toBe(false);
  });
});
