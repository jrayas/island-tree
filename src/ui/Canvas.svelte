<script lang="ts">
  // The pan and zoom surface, built on Svelte Flow (xyflow, MIT licence, https://svelteflow.dev).
  // Its on-screen credit is hidden to keep the view clean; the credit is in README.md instead.
  // Receives where every card should be and glides the
  // cards there frame by frame, rebuilding the nodes each frame so the branches
  // stay attached (see layout/animate.ts for why this is not a CSS transition).
  import { onDestroy, untrack } from "svelte";
  import {
    SvelteFlow,
    Background,
    BackgroundVariant,
    ControlButton,
    Controls,
    type Edge,
    type Node,
  } from "@xyflow/svelte";
  import { easeFactor, seedPositions, stepPositions } from "../layout/animate";
  import type { CurveStyle, Point } from "../layout/types";
  import type { GridType } from "../settings/schema";
  import type { CanvasItem } from "./cardData";
  import { provideCanvasActions, provideZoom } from "./context";
  import IslandNode from "./IslandNode.svelte";
  import BranchEdge from "./BranchEdge.svelte";
  import BoxZoom from "./BoxZoom.svelte";
  import FitController from "./FitController.svelte";
  import ZoomWatcher from "./ZoomWatcher.svelte";
  import { ZoomState } from "./zoomState.svelte";

  let {
    items,
    targets,
    cardWidth,
    cardHeight,
    radialCentre,
    curve,
    grid,
    fitKey,
    onnodeclick,
    onbadge,
    onopen,
  }: {
    items: CanvasItem[];
    /** Card centres by id. */
    targets: Map<string, Point>;
    cardWidth: number;
    cardHeight: number;
    /** The middle of a radial layout, or null for vertical. */
    radialCentre: Point | null;
    /** How branches are drawn. */
    curve: CurveStyle;
    /** The pattern behind the cards. */
    grid: { type: GridType; size: number; spacing: number };
    /** Changing this value moves the camera to frame all cards. */
    fitKey: number;
    onnodeclick: (id: string) => void;
    onbadge: (id: string) => void;
    onopen: (id: string, modifiers: { ctrlKey: boolean; metaKey: boolean }) => void;
  } = $props();

  provideCanvasActions({
    onbadge: (id) => onbadge(id),
    onopen: (id, modifiers) => onopen(id, modifiers),
  });

  provideZoom(new ZoomState());

  // "Zoom to area" mode: on from the fourth zoom button, off after a zoom or Escape.
  let boxMode = $state(false);

  let paneWidth = $state(0);
  let paneHeight = $state(0);

  const MIN_ZOOM = 0.2;

  const nodeTypes = { island: IslandNode };
  const edgeTypes = { branch: BranchEdge };

  // Positions are plain data, not state: they change every frame and only
  // the rebuilt `nodes` array needs to notify Svelte.
  let current = new Map<string, Point>();
  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);
  let frame = 0;
  let lastTime = 0;

  function buildNodes(list: CanvasItem[], goal: Map<string, Point>): Node[] {
    return list.map((item) => {
      const centre = current.get(item.id) ?? goal.get(item.id) ?? { x: 0, y: 0 };
      return {
        id: item.id,
        type: "island",
        position: { x: centre.x - cardWidth / 2, y: centre.y - cardHeight / 2 },
        width: cardWidth,
        height: cardHeight,
        data: item.data,
        draggable: false,
        selectable: false,
        connectable: false,
        deletable: false,
        focusable: false,
      };
    });
  }

  function buildEdges(list: CanvasItem[], centre: Point | null, style: CurveStyle): Edge[] {
    return list
      .filter((item) => item.parentId !== null)
      .map((item) => ({
        id: `edge:${item.id}`,
        source: item.parentId as string,
        target: item.id,
        type: "branch",
        data: { highlight: item.highlight, centre, curve: style },
        selectable: false,
        focusable: false,
        deletable: false,
      }));
  }

  function step(time: number): void {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const factor = reduce ? 1 : easeFactor(time - lastTime);
    lastTime = time;
    const result = stepPositions(current, targets, factor);
    current = result.positions;
    nodes = buildNodes(items, targets);
    frame = result.settled ? 0 : requestAnimationFrame(step);
  }

  function kick(): void {
    if (frame) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(step);
  }

  // First paint is at the final positions so the view can fit them straight away.
  untrack(() => {
    current = new Map(targets);
    nodes = buildNodes(items, targets);
    edges = buildEdges(items, radialCentre, curve);
  });

  let first = true;
  $effect(() => {
    const list = items;
    const goal = targets;
    const centre = radialCentre;
    const style = curve;
    if (first) {
      first = false;
      return;
    }
    current = seedPositions(
      current,
      goal,
      list.map(({ id, parentId }) => ({ id, parentId })),
    );
    nodes = buildNodes(list, goal);
    edges = buildEdges(list, centre, style);
    kick();
  });

  onDestroy(() => {
    if (frame) cancelAnimationFrame(frame);
  });
</script>

<div class="island-canvas" bind:clientWidth={paneWidth} bind:clientHeight={paneHeight}>
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    fitView
    fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
    minZoom={MIN_ZOOM}
    maxZoom={2}
    panOnDrag={!boxMode}
    nodesDraggable={false}
    nodesConnectable={false}
    nodesFocusable={false}
    edgesFocusable={false}
    elementsSelectable={false}
    zoomOnDoubleClick={false}
    proOptions={{ hideAttribution: true }}
    onnodeclick={({ node }) => onnodeclick(node.id)}
  >
    {#if grid.type !== "none"}
      <Background
        variant={grid.type === "lines" ? BackgroundVariant.Lines : BackgroundVariant.Dots}
        gap={grid.spacing}
        size={grid.size}
      />
    {/if}
    <Controls showLock={false} position="top-left">
      <ControlButton
        class={["island-box-zoom", boxMode && "is-active"]}
        onclick={() => (boxMode = !boxMode)}
        title="Zoom to area (or hold Shift and drag)"
        aria-label="Zoom to area"
        aria-pressed={boxMode}
      >
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
          <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
        </svg>
      </ControlButton>
    </Controls>
    <BoxZoom active={boxMode} minZoom={MIN_ZOOM} onfinish={() => (boxMode = false)} />
    <ZoomWatcher />
    <FitController
      trigger={fitKey}
      {targets}
      {cardWidth}
      {cardHeight}
      width={paneWidth}
      height={paneHeight}
    />
  </SvelteFlow>
</div>
