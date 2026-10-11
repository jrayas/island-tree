import { describe, expect, it } from "vitest";
import { END_MARGIN, MAX_STEP_SECONDS, movedByOthers, nextAutoScroll, opposite, stepAutoScroll, type View } from "./autoScroll";

// Cards 0..2000 across and 0..3000 down, in a 800 by 600 pane at 100% zoom.
const cards = { x: 0, y: 0, width: 2000, height: 3000 };
const pane = { width: 800, height: 600 };
const start: View = { x: END_MARGIN, y: END_MARGIN, zoom: 1 };

describe("stepAutoScroll", () => {
  it("moves down by speed times time, as the cards slide up", () => {
    const step = stepAutoScroll(start, "down", 100, 0.05, cards, pane, "stop");
    expect(step.view.y).toBeCloseTo(END_MARGIN - 5);
    expect(step.view.x).toBe(start.x);
    expect(step.ended).toBe(false);
  });

  it("moves in each of the four directions", () => {
    const mid: View = { x: -500, y: -500, zoom: 1 };
    expect(stepAutoScroll(mid, "up", 100, 0.1, cards, pane, "stop").view.y).toBeCloseTo(-490);
    expect(stepAutoScroll(mid, "right", 100, 0.1, cards, pane, "stop").view.x).toBeCloseTo(-510);
    expect(stepAutoScroll(mid, "left", 100, 0.1, cards, pane, "stop").view.x).toBeCloseTo(-490);
  });

  it("keeps the same speed on screen at any zoom", () => {
    const zoomed: View = { x: 0, y: -100, zoom: 0.5 };
    expect(stepAutoScroll(zoomed, "down", 100, 0.1, cards, pane, "stop").view.y).toBeCloseTo(-110);
  });

  it("limits a long frame so the view does not jump", () => {
    const step = stepAutoScroll(start, "down", 100, 5, cards, pane, "stop");
    expect(step.view.y).toBeCloseTo(END_MARGIN - 100 * MAX_STEP_SECONDS);
  });

  it("stops with the last card a margin from the far edge", () => {
    const nearEnd: View = { x: 0, y: pane.height - END_MARGIN - cards.height + 2, zoom: 1 };
    const step = stepAutoScroll(nearEnd, "down", 100, 0.1, cards, pane, "stop");
    expect(step.view.y).toBe(pane.height - END_MARGIN - cards.height);
    expect(step.ended).toBe(true);
    expect(step.direction).toBe("down");
  });

  it("stops going up with the first card a margin from the near edge", () => {
    const step = stepAutoScroll({ x: 0, y: END_MARGIN - 1, zoom: 1 }, "up", 100, 0.1, cards, pane, "stop");
    expect(step.view.y).toBe(END_MARGIN);
    expect(step.ended).toBe(true);
  });

  it("turns round at the end when asked to reverse", () => {
    const nearEnd: View = { x: 0, y: pane.height - END_MARGIN - cards.height + 2, zoom: 1 };
    const step = stepAutoScroll(nearEnd, "down", 100, 0.1, cards, pane, "reverse");
    expect(step.direction).toBe("up");
    expect(step.ended).toBe(false);
    const back = stepAutoScroll(step.view, step.direction, 100, 0.1, cards, pane, "reverse");
    expect(back.view.y).toBeGreaterThan(step.view.y);
  });

  it("does not drag the view back from a place the user took it to", () => {
    const beyond: View = { x: 0, y: -5000, zoom: 1 };
    const step = stepAutoScroll(beyond, "down", 100, 0.1, cards, pane, "stop");
    expect(step.view.y).toBe(-5000);
    expect(step.ended).toBe(true);
  });

  it("has nothing to scroll when the cards fit in the pane", () => {
    const small = { x: 0, y: 0, width: 300, height: 200 };
    const step = stepAutoScroll(start, "down", 100, 0.1, small, pane, "reverse");
    expect(step.ended).toBe(true);
    expect(step.fits).toBe(true);
    expect(step.view).toEqual(start);
    expect(step.direction).toBe("down");
  });

  it("ignores a negative speed or time", () => {
    expect(stepAutoScroll(start, "down", -50, 0.1, cards, pane, "stop").view.y).toBe(start.y);
    expect(stepAutoScroll(start, "down", 50, -1, cards, pane, "stop").view.y).toBe(start.y);
  });
});

describe("opposite", () => {
  it("pairs each direction with its reverse", () => {
    expect(opposite("down")).toBe("up");
    expect(opposite("up")).toBe("down");
    expect(opposite("left")).toBe("right");
    expect(opposite("right")).toBe("left");
  });
});

describe("movedByOthers", () => {
  it("accepts the view where the last step left it", () => {
    expect(movedByOthers({ x: 10, y: 20, zoom: 1 }, { x: 10.2, y: 19.8, zoom: 1 })).toBe(false);
  });
  it("notices a pan or a zoom", () => {
    expect(movedByOthers({ x: 10, y: 20, zoom: 1 }, { x: 14, y: 20, zoom: 1 })).toBe(true);
    expect(movedByOthers({ x: 10, y: 20, zoom: 1 }, { x: 10, y: 20, zoom: 1.2 })).toBe(true);
  });
});

describe("nextAutoScroll", () => {
  const idle = { running: false, direction: "down" as const };

  it("toggles between running and paused, keeping the direction", () => {
    const on = nextAutoScroll(idle, { type: "toggle" });
    expect(on).toEqual({ running: true, direction: "down" });
    expect(nextAutoScroll(on, { type: "toggle" })).toEqual(idle);
  });

  it("go sets the direction and starts", () => {
    expect(nextAutoScroll(idle, { type: "go", direction: "right" })).toEqual({ running: true, direction: "right" });
  });

  it("pause stops and leaves an idle state as it was", () => {
    expect(nextAutoScroll({ running: true, direction: "up" }, { type: "pause" })).toEqual({ running: false, direction: "up" });
    expect(nextAutoScroll(idle, { type: "pause" })).toBe(idle);
  });

  it("turn changes only the direction", () => {
    expect(nextAutoScroll({ running: true, direction: "down" }, { type: "turn", direction: "up" })).toEqual({
      running: true,
      direction: "up",
    });
  });
});
