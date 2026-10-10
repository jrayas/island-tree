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
  import type { CurveStyle, MindSide, Point } from "../layout/types";
  import type { GridType, WheelBehaviour } from "../settings/schema";
  import type { Box } from "../layout/bounds";
  import type { CanvasItem } from "./cardData";
  import { provideCanvasActions, provideZoom } from "./context";
  import IslandNode from "./IslandNode.svelte";
  import BranchEdge from "./BranchEdge.svelte";
  import BoxZoom from "./BoxZoom.svelte";
  import FitController from "./FitController.svelte";
  import FollowSelection from "./FollowSelection.svelte";
  import ZoomWatcher from "./ZoomWatcher.svelte";
  import { PAN_BUTTONS, isFitShortcut, keyBelongsElsewhere, wheelOptions, zoomKeys } from "./mouse";
  import { ZoomState } from "./zoomState.svelte";

  let {
    items,
    targets,
    cardWidth,
    cardHeight,
    radialCentre,
    sides,
    frameBox,
    curve,
    grid,
    fitKey,
    wheel,
    activeId,
    onkey,
    onfit,
    onnodeclick,
    onbadge,
    onopen,
    ondrop,
    droprefusal,
    onrefuse,
    oncontext,
  }: {
    items: CanvasItem[];
    /** Card centres by id. */
    targets: Map<string, Point>;
    cardWidth: number;
    cardHeight: number;
    /** The middle of a radial layout, or null for vertical. */
    radialCentre: Point | null;
    /** Mind map only: the side of the root each card is on, or null for the other layouts. */
    sides: Map<string, MindSide> | null;
    /** A box to frame instead of the box around the cards, or null. */
    frameBox: Box | null;
    /** How branches are drawn. */
    curve: CurveStyle;
    /** The pattern behind the cards. */
    grid: { type: GridType; size: number; spacing: number };
    /** Changing this value moves the camera to frame all cards. */
    fitKey: number;
    /** What the scroll wheel does: pan (as in Obsidian's Canvas) or zoom. */
    wheel: WheelBehaviour;
    /** The selected card, which the keyboard moves and the screen reader announces. */
    activeId: string | null;
    /** A navigation key was pressed on the tree. Returns true when the key was handled. */
    onkey: (event: KeyboardEvent) => boolean;
    /** The Fit button or Shift and 1: frame the cards the same way the automatic fit does. */
    onfit: () => void;
    onnodeclick: (id: string) => void;
    onbadge: (id: string) => void;
    onopen: (id: string, modifiers: { ctrlKey: boolean; metaKey: boolean }) => void;
    /** A card was dropped on another card, and the drop is allowed. */
    ondrop: (sourceId: string, targetId: string) => void;
    /** Why dropping the first card on the second is not allowed, or null when it is. */
    droprefusal: (sourceId: string, targetId: string) => string | null;
    /** A drop was refused; show why. */
    onrefuse: (message: string) => void;
    oncontext: (id: string, event: MouseEvent) => void;
  } = $props();

  provideCanvasActions({
    onbadge: (id) => onbadge(id),
    onopen: (id, modifiers) => onopen(id, modifiers),
    ondragstart: (id, event) => pressCard(id, event),
    oncontext: (id, event) => oncontext(id, event),
  });

  // Dragging a card onto a folder. The card itself stays where the layout put it; a small
  // ghost follows the pointer and the card under it lights up as the target (green if the move
  // is allowed, red if not). Nothing starts until the pointer has moved a few pixels, so a
  // plain click still selects or opens as before.
  const DRAG_START_DISTANCE = 6;
  let canvasEl = $state<HTMLDivElement>();
  let drag = $state<{ label: string; x: number; y: number } | null>(null);
  let pressed: { id: string; x: number; y: number } | null = null;
  let over: { id: string; refusal: string | null } | null = null;
  let marked: Element | null = null;
  let cancelled = false;
  let suppressClick = false;
  let dragWindow: Window | null = null;

  function pressCard(id: string, event: PointerEvent): void {
    if (event.button !== 0 || !canvasEl) return;
    stopListening();
    pressed = { id, x: event.clientX, y: event.clientY };
    dragWindow = canvasEl.ownerDocument.defaultView ?? window;
    dragWindow.addEventListener("pointermove", moveDrag);
    dragWindow.addEventListener("pointerup", endDrag);
    dragWindow.addEventListener("keydown", keyDrag);
  }

  function stopListening(): void {
    dragWindow?.removeEventListener("pointermove", moveDrag);
    dragWindow?.removeEventListener("pointerup", endDrag);
    dragWindow?.removeEventListener("keydown", keyDrag);
    dragWindow = null;
  }

  function unmark(): void {
    marked?.classList.remove("island-card-drop", "island-card-drop-no");
    marked = null;
  }

  function moveDrag(event: PointerEvent): void {
    if (!pressed || !canvasEl || cancelled) return;
    if (!drag) {
      if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < DRAG_START_DISTANCE) return;
      const label = items.find((item) => item.id === pressed?.id)?.data.display.label ?? "";
      drag = { label, x: 0, y: 0 };
    }
    const box = canvasEl.getBoundingClientRect();
    drag = { label: drag.label, x: event.clientX - box.left, y: event.clientY - box.top };
    const node = canvasEl.ownerDocument.elementFromPoint(event.clientX, event.clientY)?.closest(".svelte-flow__node");
    const targetId = node?.getAttribute("data-id") ?? null;
    if (targetId === pressed.id) return;
    if ((over?.id ?? null) === targetId) return;
    unmark();
    over = null;
    if (!targetId || !node) return;
    const refusal = droprefusal(pressed.id, targetId);
    over = { id: targetId, refusal };
    marked = node.querySelector(".island-card");
    marked?.classList.add(refusal ? "island-card-drop-no" : "island-card-drop");
  }

  function endDrag(): void {
    const source = pressed?.id ?? null;
    const dragged = drag !== null;
    const target = over;
    stopListening();
    unmark();
    pressed = null;
    drag = null;
    over = null;
    if (!dragged && !cancelled) return;
    cancelled = false;
    // The click that follows a drag must not also select or open the card it ended on.
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 0);
    if (!dragged || !target || !source) return;
    if (target.refusal) onrefuse(target.refusal);
    else ondrop(source, target.id);
  }

  function keyDrag(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !drag) return;
    event.preventDefault();
    unmark();
    drag = null;
    over = null;
    cancelled = true;
  }

  provideZoom(new ZoomState());

  // Space held over the dashboard turns a drag into a pan even when it starts on a card, and
  // scroll into a zoom, as in Canvas. Cards stop catching the pointer while it is held.
  let hovering = false;
  let spaceHeld = $state(false);

  function keyDown(event: KeyboardEvent): void {
    if (!hovering || keyBelongsElsewhere(event.target as Element | null)) return;
    if (event.code === "Space") {
      event.preventDefault();
      spaceHeld = true;
    } else if (isFitShortcut(event)) {
      event.preventDefault();
      onfit();
    }
  }

  function keyUp(event: KeyboardEvent): void {
    if (event.code === "Space") spaceHeld = false;
  }

  // A right-button drag pans, so the menu that follows it must not open on a card. A plain
  // right-click (no movement) still gets its menu.
  let rightDown: { x: number; y: number } | null = null;

  function rightPressed(event: PointerEvent): void {
    if (event.button === 2) rightDown = { x: event.clientX, y: event.clientY };
  }

  function menuRequested(event: MouseEvent): void {
    const moved = rightDown && Math.hypot(event.clientX - rightDown.x, event.clientY - rightDown.y) > DRAG_START_DISTANCE;
    rightDown = null;
    if (!moved) return;
    event.preventDefault();
    event.stopPropagation();
  }

  // The keyboard moves the selection through the cards like a tree view. Keys meant for a button or
  // box inside the canvas, and Alt (Obsidian's Back) or Ctrl and Cmd shortcuts, are left alone.
  function treeKey(event: KeyboardEvent): void {
    if (keyBelongsElsewhere(event.target as Element | null)) return;
    if (event.altKey || ((event.ctrlKey || event.metaKey) && event.key !== "Enter")) return;
    if (onkey(event)) event.preventDefault();
  }

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

  function buildEdges(
    list: CanvasItem[],
    centre: Point | null,
    style: CurveStyle,
    sideOf: Map<string, MindSide> | null,
    width: number,
  ): Edge[] {
    return list
      .filter((item) => item.parentId !== null)
      .map((item) => ({
        id: `edge:${item.id}`,
        source: item.parentId as string,
        target: item.id,
        type: "branch",
        data: {
          highlight: item.highlight,
          centre,
          curve: style,
          side: sideOf?.get(item.id) ?? null,
          cardWidth: width,
        },
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
    edges = buildEdges(items, radialCentre, curve, sides, cardWidth);
  });

  let first = true;
  $effect(() => {
    const list = items;
    const goal = targets;
    const centre = radialCentre;
    const style = curve;
    const sideOf = sides;
    const width = cardWidth;
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
    edges = buildEdges(list, centre, style, sideOf, width);
    kick();
  });

  onDestroy(() => {
    if (frame) cancelAnimationFrame(frame);
    stopListening();
  });
</script>

<svelte:window onkeydown={keyDown} onkeyup={keyUp} onblur={() => (spaceHeld = false)} />

<div
  class="island-canvas"
  class:is-dragging={drag !== null}
  class:is-space={spaceHeld}
  role="tree"
  tabindex="0"
  aria-label="Vault tree. Use the arrow keys to move, Enter to open, and F to show or hide a folder's files."
  aria-activedescendant={activeId ? `island-card-${activeId}` : undefined}
  onkeydown={treeKey}
  onpointerdowncapture={rightPressed}
  oncontextmenucapture={menuRequested}
  onmouseenter={() => (hovering = true)}
  onmouseleave={() => (hovering = false)}
  bind:this={canvasEl}
  bind:clientWidth={paneWidth}
  bind:clientHeight={paneHeight}
>
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    fitView
    fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
    minZoom={MIN_ZOOM}
    maxZoom={2}
    panOnDrag={boxMode ? false : PAN_BUTTONS}
    {...wheelOptions(wheel)}
    zoomActivationKey={zoomKeys(wheel)}
    nodesDraggable={false}
    nodesConnectable={false}
    nodesFocusable={false}
    edgesFocusable={false}
    elementsSelectable={false}
    zoomOnDoubleClick={false}
    proOptions={{ hideAttribution: true }}
    onnodeclick={({ node }) => {
      if (!suppressClick) onnodeclick(node.id);
    }}
  >
    {#if grid.type !== "none"}
      <Background
        variant={grid.type === "lines" ? BackgroundVariant.Lines : BackgroundVariant.Dots}
        gap={grid.spacing}
        size={grid.size}
      />
    {/if}
    <Controls showLock={false} showFitView={false} position="top-left">
      <ControlButton
        class="svelte-flow__controls-fitview island-fit"
        onclick={onfit}
        title="Fit to screen (Shift and 1)"
        aria-label="Fit to screen"
      >
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </ControlButton>
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
    <FollowSelection {activeId} {targets} {cardWidth} {cardHeight} width={paneWidth} height={paneHeight} />
    <FitController
      trigger={fitKey}
      {targets}
      {cardWidth}
      {cardHeight}
      {frameBox}
      width={paneWidth}
      height={paneHeight}
    />
  </SvelteFlow>
  {#if drag}
    <div class="island-drag-ghost" style:left="{drag.x}px" style:top="{drag.y}px">{drag.label}</div>
  {/if}
</div>
