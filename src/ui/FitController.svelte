<script lang="ts">
  // Moves the camera to frame the cards when `trigger` changes. It frames where
  // the cards are going, not where they are now, because they are still gliding.
  // Must sit inside <SvelteFlow> so it can reach the viewport.
  import { untrack } from "svelte";
  import { getViewportForBounds, useSvelteFlow } from "@xyflow/svelte";
  import { boundsOfCards } from "../layout/bounds";
  import type { Point } from "../layout/types";

  let {
    trigger,
    targets,
    cardWidth,
    cardHeight,
    width,
    height,
  }: {
    trigger: number;
    targets: Map<string, Point>;
    cardWidth: number;
    cardHeight: number;
    width: number;
    height: number;
  } = $props();

  const { setViewport } = useSvelteFlow();
  let last = untrack(() => trigger);

  $effect(() => {
    if (trigger === last) return;
    last = trigger;
    const box = boundsOfCards(targets.values(), cardWidth, cardHeight);
    if (!box || width === 0 || height === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void setViewport(getViewportForBounds(box, width, height, 0.2, 1, 0.2), {
      duration: reduce ? 0 : 400,
    });
  });
</script>
