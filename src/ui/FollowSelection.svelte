<script lang="ts">
  // Keeps the selected card in view: when the keyboard moves the selection off screen, or a search goes
  // to a card that is. The camera glides to put it in the middle, at the same zoom. A card already in view is left alone, so a click never moves the camera. Must sit
  // inside <SvelteFlow>.
  import { untrack } from "svelte";
  import { useSvelteFlow } from "@xyflow/svelte";
  import type { Point } from "../layout/types";

  let {
    activeId,
    targets,
    cardWidth,
    cardHeight,
    width,
    height,
  }: {
    activeId: string | null;
    targets: Map<string, Point>;
    cardWidth: number;
    cardHeight: number;
    width: number;
    height: number;
  } = $props();

  const { getViewport, setViewport } = useSvelteFlow();
  /** How close to the edge a card may be before the camera follows it, in pixels. */
  const EDGE = 48;

  function bringIntoView(id: string): void {
    const centre = targets.get(id);
    if (!centre) return;
    const { x, y, zoom } = getViewport();
    const left = (centre.x - cardWidth / 2) * zoom + x;
    const right = (centre.x + cardWidth / 2) * zoom + x;
    const top = (centre.y - cardHeight / 2) * zoom + y;
    const bottom = (centre.y + cardHeight / 2) * zoom + y;
    const inView = left >= EDGE && right <= width - EDGE && top >= EDGE && bottom <= height - EDGE;
    if (inView) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void setViewport(
      { x: width / 2 - centre.x * zoom, y: height / 2 - centre.y * zoom, zoom },
      { duration: reduce ? 0 : 250 },
    );
  }

  $effect(() => {
    const id = activeId;
    if (id === null || width === 0 || height === 0) return;
    untrack(() => bringIntoView(id));
  });
</script>
