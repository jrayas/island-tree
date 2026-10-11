/**
 * How the mouse and keyboard move the camera, matching Obsidian's own Canvas.
 *
 * In Canvas the scroll wheel pans, Shift and scroll pans sideways, and Ctrl or
 * Cmd (or Space) and scroll zooms. Its "Mouse wheel behaviour" option swaps the
 * wheel to zoom. These small pure pieces turn that choice into Svelte Flow's
 * options and decide when a key press belongs to the dashboard.
 */
import type { AutoScrollAction, ScrollDirection } from "../layout/autoScroll";
import type { WheelBehaviour } from "../settings/schema";

/** Svelte Flow's scroll options for a wheel behaviour. Ctrl or Cmd and scroll always zooms too. */
export function wheelOptions(wheel: WheelBehaviour): { panOnScroll: boolean; zoomOnScroll: boolean } {
  return wheel === "pan" ? { panOnScroll: true, zoomOnScroll: false } : { panOnScroll: false, zoomOnScroll: true };
}

/**
 * The keys that make scroll zoom. Ctrl and Cmd always do. Space does too while the wheel pans, as in
 * Canvas; while the wheel zooms, Space (Svelte Flow's own pan key) makes scroll pan instead. Svelte
 * Flow matches the character a key types, so Space is a single space here.
 */
export function zoomKeys(wheel: WheelBehaviour): string[] {
  return wheel === "pan" ? ["Control", "Meta", " "] : ["Control", "Meta"];
}

/** Mouse buttons that pan on an empty background: left, middle and right, as in Canvas. */
export const PAN_BUTTONS: number[] = [0, 1, 2];

/** The part of an event target the check needs, so it can be tested without a browser. */
export interface KeyTargetLike {
  closest(selector: string): unknown;
}

/**
 * Whether a key press is meant for something other than the dashboard: typing in a box, or a
 * button or list that has focus. Space and Shift and 1 must leave those alone.
 */
export function keyBelongsElsewhere(target: KeyTargetLike | null): boolean {
  if (!target || typeof target.closest !== "function") return false;
  return target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]') !== null;
}

/** The parts of a key event the shortcuts look at. */
export interface KeyPress {
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

const ARROW_DIRECTIONS: Record<string, ScrollDirection> = {
  ArrowDown: "down",
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowLeft: "left",
};

/** Whether this is an arrow key with Shift held and nothing else, which sets the auto-scroll direction. */
export function isShiftArrow(event: KeyPress & { key: string }): boolean {
  return event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && event.key in ARROW_DIRECTIONS;
}

/**
 * What a key press does to auto-scroll, or null when it is not an auto-scroll key. Shift and Space
 * starts or pauses; Shift and an arrow points it that way and starts it. Ctrl, Cmd and Alt are left
 * alone (on some keyboards AltGr counts as Ctrl and Alt), and plain Space and arrows are untouched.
 */
export function autoScrollKey(event: KeyPress & { key: string }): AutoScrollAction | null {
  if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.code === "Space") return { type: "toggle" };
  const direction = ARROW_DIRECTIONS[event.key];
  return direction ? { type: "go", direction } : null;
}

/** Shift and 1 (the key itself, so it works on every keyboard layout): the shortcut for zoom to fit. */
export function isFitShortcut(event: KeyPress): boolean {
  return event.code === "Digit1" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
}
