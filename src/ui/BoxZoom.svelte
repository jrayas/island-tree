<script lang="ts">
  // "Zoom to area": draw a rectangle over the graph and the camera glides to fit it.
  // It works in two ways: with box mode on (the zoom button), or by holding Shift while
  // dragging. Either way a transparent layer sits over the graph and takes the drag, so
  // the pane underneath cannot pan; Svelte Flow's own Shift-drag selection box never gets
  // involved because this dashboard keeps selection off. Must sit inside <SvelteFlow> to
  // reach the camera. The geometry rules live in layout/boxZoom.ts.
  import { useSvelteFlow } from "@xyflow/svelte";
  import {
    BOX_MAX_ZOOM,
    cameraForRect,
    isDeliberateBox,
    rectBetween,
    rectToCanvas,
    type Rect,
  } from "../layout/boxZoom";
  import type { Point } from "../layout/types";

  let {
    active,
    minZoom,
    onfinish,
  }: {
    /** Box mode is on (from the zoom button). */
    active: boolean;
    minZoom: number;
    /** Called when the mode should switch off: after a zoom, or on Escape. */
    onfinish: () => void;
  } = $props();

  const { getViewport, setViewport } = useSvelteFlow();

  let layer = $state<HTMLDivElement>();
  let shiftHeld = $state(false);
  // The corner the drag began at, and the rectangle being drawn (pane pixels).
  let start: Point | null = null;
  let rect = $state<Rect | null>(null);

  // The layer only takes the pointer while it is needed, so the graph works normally otherwise.
  const armed = $derived(active || shiftHeld || rect !== null);

  /** A pointer position relative to the layer, kept inside it. */
  function pointOf(event: PointerEvent): Point {
    const box = layer!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(event.clientX - box.left, 0), box.width),
      y: Math.min(Math.max(event.clientY - box.top, 0), box.height),
    };
  }

  function begin(event: PointerEvent): void {
    if (event.button !== 0 || !layer) return;
    event.preventDefault();
    try {
      layer.setPointerCapture(event.pointerId);
    } catch {
      // The pointer may already have ended; the drag still works without capture.
    }
    start = pointOf(event);
    rect = rectBetween(start, start);
  }

  function move(event: PointerEvent): void {
    if (start) rect = rectBetween(start, pointOf(event));
  }

  function end(event: PointerEvent): void {
    if (!start || !layer) return;
    const dragged = rectBetween(start, pointOf(event));
    start = null;
    rect = null;
    // A tiny drag is an accidental click: nothing happens and box mode stays on to try again.
    if (!isDeliberateBox(dragged)) return;
    const pane = layer.getBoundingClientRect();
    const area = rectToCanvas(dragged, getViewport());
    const camera = cameraForRect(area, pane.width, pane.height, { minZoom, maxZoom: BOX_MAX_ZOOM });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void setViewport(camera, { duration: reduce ? 0 : 400 });
    onfinish();
  }

  function cancelDrag(): void {
    start = null;
    rect = null;
  }

  /** Shift pressed while typing in a text box must not arm the layer. */
  function isTyping(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    );
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key === "Shift" && !isTyping(event.target)) shiftHeld = true;
    if (event.key === "Escape" && (active || rect !== null)) {
      event.preventDefault();
      cancelDrag();
      if (active) onfinish();
    }
  }

  function keyup(event: KeyboardEvent): void {
    if (event.key === "Shift") shiftHeld = false;
  }
</script>

<svelte:window onkeydown={keydown} onkeyup={keyup} onblur={() => (shiftHeld = false)} />

<div
  class="island-box-layer"
  class:is-armed={armed}
  bind:this={layer}
  role="presentation"
  onpointerdown={begin}
  onpointermove={move}
  onpointerup={end}
  onpointercancel={cancelDrag}
>
  {#if rect}
    <div
      class="island-box-rect"
      style:left="{rect.x}px"
      style:top="{rect.y}px"
      style:width="{rect.width}px"
      style:height="{rect.height}px"
    ></div>
  {/if}
</div>
