<script lang="ts">
  // Moves the camera to frame the cards when `trigger` changes. It frames where
  // the cards are going, not where they are now, because they are still gliding.
  // Must sit inside <SvelteFlow> so it can reach the viewport.
  import { untrack } from "svelte";
  import { getViewportForBounds, useSvelteFlow } from "@xyflow/svelte";
  import { boundsOfCards, type Box } from "../layout/bounds";
  import { CAMERA_MIN_ZOOM } from "../layout/camera";
  import type { Point } from "../layout/types";

  let {
    trigger,
    targets,
    cardWidth,
    cardHeight,
    frameBox,
    width,
    height,
  }: {
    trigger: number;
    targets: Map<string, Point>;
    cardWidth: number;
    cardHeight: number;
    /** A box to frame instead of the box around the cards, or null. */
    frameBox: Box | null;
    width: number;
    height: number;
  } = $props();

  const { setViewport } = useSvelteFlow();
  let last = untrack(() => trigger);
  // The first fit happens as soon as the pane has a size, so the tree uses the whole view on load.
  let fitted = false;

  /** Frames the target positions. Returns false when there is nothing to frame yet. */
  function frame(duration: number): boolean {
    const box = frameBox ?? boundsOfCards(targets.values(), cardWidth, cardHeight);
    if (!box || width === 0 || height === 0) return false;
    void setViewport(getViewportForBounds(box, width, height, CAMERA_MIN_ZOOM, 1, 0.2), { duration });
    return true;
  }

  $effect(() => {
    if (!fitted) {
      if (frame(0)) {
        fitted = true;
        last = trigger;
      }
      return;
    }
    if (trigger === last) return;
    last = trigger;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    frame(reduce ? 0 : 400);
  });
</script>
