<script lang="ts">
  // Drifts the camera over the cards while `running`, for reading the dashboard hands-free. It moves
  // the view a little every frame (see layout/autoScroll.ts) and hands control back the moment
  // anything else moves it: a wheel turn, a drag, a zoom, the Fit button or a search gliding to a
  // match. Must sit inside <SvelteFlow> so it can reach the viewport.
  import { useSvelteFlow } from "@xyflow/svelte";
  import { boundsOfCards } from "../layout/bounds";
  import {
    movedByOthers,
    stepAutoScroll,
    type PauseReason,
    type ScrollDirection,
    type ScrollEnd,
    type View,
  } from "../layout/autoScroll";
  import type { Point } from "../layout/types";

  let {
    running,
    direction,
    speed,
    atEnd,
    targets,
    cardWidth,
    cardHeight,
    width,
    height,
    onpause,
    onturn,
  }: {
    running: boolean;
    direction: ScrollDirection;
    /** Screen pixels per second. */
    speed: number;
    atEnd: ScrollEnd;
    targets: Map<string, Point>;
    cardWidth: number;
    cardHeight: number;
    width: number;
    height: number;
    /** Auto-scroll should stop: the end was reached, or something else moved the view. A reason: it could not move. */
    onpause: (reason?: PauseReason) => void;
    /** At the end with "Reverse", the direction turned round. */
    onturn: (direction: ScrollDirection) => void;
  } = $props();

  const { getViewport, setViewport } = useSvelteFlow();

  $effect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    // Where the last step left the view. If it is anywhere else next frame, someone else moved it.
    let expected: View | null = null;
    let travelled = false;

    function tick(time: number): void {
      frame = requestAnimationFrame(tick);
      const seconds = (time - last) / 1000;
      last = time;
      // A hidden pane has no size. Wait for it instead of drifting out of sight.
      if (width === 0 || height === 0) {
        expected = null;
        return;
      }
      const view = getViewport();
      if (expected && movedByOthers(expected, view)) {
        onpause();
        return;
      }
      const cards = boundsOfCards(targets.values(), cardWidth, cardHeight);
      if (!cards) return;
      const step = stepAutoScroll(view, direction, speed, seconds, cards, { width, height }, atEnd);
      if (step.direction !== direction) onturn(step.direction);
      if (step.view.x !== view.x || step.view.y !== view.y) {
        expected = step.view;
        travelled = true;
        void setViewport(step.view);
      }
      if (step.ended) onpause(step.fits ? "fits" : travelled ? undefined : "edge");
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });
</script>
