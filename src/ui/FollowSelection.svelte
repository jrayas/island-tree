<script lang="ts">
  // Keeps a card in view: the selected card when the keyboard moves the selection off screen, and
  // the first match when a search reveals one. The camera glides to put it in the middle, at the
  // same zoom. A card already in view is left alone, so a click never moves the camera. Must sit
  // inside <SvelteFlow>.
  import { untrack } from "svelte";
  import { useSvelteFlow } from "@xyflow/svelte";
  import type { Point } from "../layout/types";

  let {
    activeId,
    searchId,
    targets,
    cardWidth,
    cardHeight,
    width,
    height,
  }: {
    activeId: string | null;
    /** The first search match on screen, or null when nothing is being searched for. */
    searchId: string | null;
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

  // A search reveals its match where the layout has put it, which can be a long way off.
  $effect(() => {
    const id = searchId;
    if (id === null || width === 0 || height === 0) return;
    untrack(() => bringIntoView(id));
  });
</script>
