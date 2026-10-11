/**
 * Auto-scroll: the view drifts over the cards at a steady speed, for reading the dashboard hands-free.
 *
 * This is the pure part. Given the view, a direction, a speed and the time since the last frame it
 * says where the view goes next, and when it has reached the end of the cards. The canvas applies
 * it every frame and decides what pauses it.
 */
import type { Box } from "./bounds";

export type ScrollDirection = "down" | "up" | "right" | "left";
export type ScrollEnd = "stop" | "reverse";

/** The camera: where the flow origin sits on screen, and the zoom. As in Svelte Flow. */
export interface View {
  x: number;
  y: number;
  zoom: number;
}

/** How far past the first and last card the view may travel, in screen pixels. */
export const END_MARGIN = 48;

/** A frame longer than this is treated as this long, so a stalled tab does not make the view jump. */
export const MAX_STEP_SECONDS = 0.1;

/** Why auto-scroll stopped without moving: every card already fits, or the view is already at that end. */
export type PauseReason = "fits" | "edge";

export interface ScrollStep {
  view: View;
  direction: ScrollDirection;
  /** The view cannot go further this way. With "reverse" the direction has already been turned round. */
  ended: boolean;
  /** True when ending is because every card already fits on screen along this axis, so there is nothing to scroll. */
  fits?: boolean;
}

const OPPOSITE: Record<ScrollDirection, ScrollDirection> = {
  down: "up",
  up: "down",
  right: "left",
  left: "right",
};

export function opposite(direction: ScrollDirection): ScrollDirection {
  return OPPOSITE[direction];
}

export function isVertical(direction: ScrollDirection): boolean {
  return direction === "down" || direction === "up";
}

/**
 * The range one axis of the view's offset may take so the cards stay on screen: the last card can
 * reach `END_MARGIN` from the far edge, and the first card `END_MARGIN` from the near edge. Empty
 * (`high < low`) when the cards fit inside the pane, so there is nothing to scroll.
 */
function offsetRange(start: number, length: number, pane: number, zoom: number): { low: number; high: number } {
  return { low: pane - END_MARGIN - (start + length) * zoom, high: END_MARGIN - start * zoom };
}

/**
 * Moves the view one frame. `speed` is screen pixels per second whatever the zoom, so it feels the
 * same wherever you are. Moving "down" slides the cards up the screen, so the offset falls.
 */
export function stepAutoScroll(
  view: View,
  direction: ScrollDirection,
  speed: number,
  seconds: number,
  cards: Box,
  pane: { width: number; height: number },
  atEnd: ScrollEnd,
): ScrollStep {
  const vertical = isVertical(direction);
  const forward = direction === "down" || direction === "right";
  const range = vertical
    ? offsetRange(cards.y, cards.height, pane.height, view.zoom)
    : offsetRange(cards.x, cards.width, pane.width, view.zoom);
  if (range.high < range.low) return { view, direction, ended: true, fits: true };

  const offset = vertical ? view.y : view.x;
  const distance = Math.max(0, speed) * Math.min(Math.max(seconds, 0), MAX_STEP_SECONDS);
  const wanted = forward ? offset - distance : offset + distance;
  // Never pull the view back from a place the user took it to; only stop it going further.
  const limit = forward ? range.low : range.high;
  const past = forward ? wanted <= limit : wanted >= limit;
  const alreadyPast = forward ? offset <= limit : offset >= limit;
  const next = past ? (alreadyPast ? offset : limit) : wanted;
  const moved: View = vertical ? { ...view, y: next } : { ...view, x: next };
  if (!past) return { view: moved, direction, ended: false };
  return atEnd === "reverse"
    ? { view: moved, direction: opposite(direction), ended: false }
    : { view: moved, direction, ended: true };
}

/** Whether auto-scroll is going, and which way. Not saved: each dashboard starts from the settings. */
export interface AutoScrollState {
  running: boolean;
  direction: ScrollDirection;
}

export type AutoScrollAction =
  | { type: "toggle" }
  /** Start (or carry on) in this direction. */
  | { type: "go"; direction: ScrollDirection }
  /** Stop. A reason means it could not move at all, and the dashboard then tells the person why. */
  | { type: "pause"; reason?: PauseReason }
  /** The direction turned round at the end; keeps running. */
  | { type: "turn"; direction: ScrollDirection };

export function nextAutoScroll(state: AutoScrollState, action: AutoScrollAction): AutoScrollState {
  switch (action.type) {
    case "toggle":
      return { ...state, running: !state.running };
    case "go":
      return { running: true, direction: action.direction };
    case "pause":
      return state.running ? { ...state, running: false } : state;
    case "turn":
      return { ...state, direction: action.direction };
  }
}

/** Whether the view has moved from where the last step left it, so something else moved it. */
export function movedByOthers(expected: View, actual: View, tolerance = 0.5): boolean {
  return (
    Math.abs(expected.x - actual.x) > tolerance ||
    Math.abs(expected.y - actual.y) > tolerance ||
    Math.abs(expected.zoom - actual.zoom) > 0.0005
  );
}
