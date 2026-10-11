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
  import { FADE_OUT_MS, MAX_FADING_CARDS } from "../model/limits";
  import type { MenuEntry } from "../editing/api";
  import type { AutoScrollAction, AutoScrollState, ScrollEnd } from "../layout/autoScroll";
  import type { SavedCamera } from "../layout/camera";
  import type { CurveStyle, MindSide, Point } from "../layout/types";
  import type { GridType, WheelBehaviour } from "../settings/schema";
  import type { Box } from "../layout/bounds";
  import type { CanvasItem } from "./cardData";
  import { provideCanvasActions, provideZoom } from "./context";
  import IslandNode from "./IslandNode.svelte";
  import BranchEdge from "./BranchEdge.svelte";
  import AutoScroll from "./AutoScroll.svelte";
  import BoxZoom from "./BoxZoom.svelte";
  import FitController from "./FitController.svelte";
  import FollowSelection from "./FollowSelection.svelte";
  import SavedViewButton from "./SavedViewButton.svelte";
  import ZoomWatcher from "./ZoomWatcher.svelte";
  import {
    PAN_BUTTONS,
    autoScrollKey,
    isFitShortcut,
    isShiftArrow,
    keyBelongsElsewhere,
    wheelOptions,
    zoomKeys,
  } from "./mouse";
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
    auto,
    autoSpeed,
    autoAtEnd,
    onauto,
    savedCamera,
    onsavecamera,
    onmenu,
    onnotice,
    activeId,
    searchId,
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
    /** Whether auto-scroll is running, and which way. */
    auto: AutoScrollState;
    /** Auto-scroll speed in screen pixels per second. */
    autoSpeed: number;
    /** What auto-scroll does at the last card. */
    autoAtEnd: ScrollEnd;
    /** A key, the end of the cards or a hand on the view changed auto-scroll. */
    onauto: (action: AutoScrollAction) => void;
    /** The view saved for the layout on screen with the Saved view button, or null. */
    savedCamera: SavedCamera | null;
    /** Remember a camera for the layout on screen, or forget it when null. */
    onsavecamera: (camera: SavedCamera | null) => void;
    /** Shows a context menu at the pointer. */
    onmenu: (event: MouseEvent, entries: MenuEntry[]) => void;
    /** Shows a short message. */
    onnotice: (message: string) => void;
    /** The selected card, which the keyboard moves and the screen reader announces. */
    activeId: string | null;
    /** The first search match on screen, which the camera glides to. */
    searchId: string | null;
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

  // Fit (the button or Shift and 1) moves the view with an animation, so auto-scroll stops first.
  let lastFitKey = untrack(() => fitKey);
  $effect(() => {
    if (fitKey === lastFitKey) return;
    lastFitKey = fitKey;
    untrack(() => onauto({ type: "pause" }));
  });

  // Space held over the dashboard turns a drag into a pan even when it starts on a card, and
  // scroll into a zoom, as in Canvas. Cards stop catching the pointer while it is held.
  let hovering = false;
  let spaceHeld = $state(false);

  function keyDown(event: KeyboardEvent): void {
    // The keys belong to the dashboard while the pointer is over it or the keyboard is in it.
    const focused = canvasEl?.contains(canvasEl.ownerDocument.activeElement) ?? false;
    if (!(hovering || focused) || keyBelongsElsewhere(event.target as Element | null)) return;
    // Shift and Space, and Shift and an arrow, drive auto-scroll. Checked before plain Space, which pans.
    const scroll = autoScrollKey(event);
    if (scroll) {
      event.preventDefault();
      if (!event.repeat) onauto(scroll);
      return;
    }
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
    // A hand on the view (a drag, a click on a card, a zoom button) takes over from auto-scroll. Its
    // own button is excluded, or pressing Pause would pause and then start it again. It has to stop:
    // every frame it sets the view, which would cut short any animated move that starts meanwhile.
    if (!(event.target as Element | null)?.closest?.(".island-auto-scroll")) onauto({ type: "pause" });
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
    // Shift and an arrow belongs to auto-scroll (see keyDown), not to moving through the cards.
    if (isShiftArrow(event)) return;
    if (onkey(event)) {
      event.preventDefault();
      // Moving through the cards by hand takes over from auto-scroll.
      onauto({ type: "pause" });
    }
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

  // Cards that have just been removed stay where they were while they fade, then go. Plain data,
  // like the positions: only the rebuilt `nodes` array notifies Svelte.
  const leaving = new Map<string, { item: CanvasItem; centre: Point }>();
  let fadeTimer = 0;
  let previous: CanvasItem[] = [];

  function buildNodes(list: CanvasItem[], goal: Map<string, Point>): Node[] {
    const fading = [...leaving.values()].map(({ item, centre }) => ({
      item: { ...item, data: { ...item.data, leaving: true } },
      centre,
    }));
    const placed = [...list.map((item) => ({ item, centre: current.get(item.id) ?? goal.get(item.id) ?? { x: 0, y: 0 } })), ...fading];
    return placed.map(({ item, centre }) => {
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

  /** Notes which cards the new list no longer has, so they can fade out instead of vanishing. */
  function startFades(list: CanvasItem[]): void {
    const now = new Set(list.map((item) => item.id));
    for (const id of [...leaving.keys()]) if (now.has(id)) leaving.delete(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gone = previous.filter((item) => !now.has(item.id) && !leaving.has(item.id));
    if (reduce || gone.length === 0 || gone.length > MAX_FADING_CARDS) return;
    for (const item of gone) {
      const centre = current.get(item.id);
      if (centre) leaving.set(item.id, { item, centre });
    }
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => {
      leaving.clear();
      nodes = buildNodes(items, targets);
    }, FADE_OUT_MS + 40);
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
    previous = items;
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
    // Before the positions are re-seeded, which drops the removed cards': note where they were.
    startFades(list);
    current = seedPositions(
      current,
      goal,
      list.map(({ id, parentId }) => ({ id, parentId })),
    );
    previous = list;
    nodes = buildNodes(list, goal);
    edges = buildEdges(list, centre, style, sideOf, width);
    kick();
  });

  onDestroy(() => {
    window.clearTimeout(fadeTimer);
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
  aria-label="Vault tree. Use the arrow keys to move, Enter to open, F to show or hide a folder's files, and Shift with Space or an arrow to scroll on its own."
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
    onlyRenderVisibleElements
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
          <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M20 9V5.5A1.5 1.5 0 0 0 18.5 4H15M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
          <rect x="8.5" y="9" width="7" height="6" rx="1" />
        </svg>
      </ControlButton>
      <ControlButton
        class={["island-auto-scroll", auto.running && "is-active"]}
        onclick={() => onauto({ type: "toggle" })}
        title={auto.running ? "Pause auto-scroll (Shift and Space)" : "Start auto-scroll (Shift and Space)"}
        aria-label={auto.running ? "Pause auto-scroll" : "Start auto-scroll"}
        aria-pressed={auto.running}
      >
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
          {#if auto.running}
            <path d="M9 5v14M15 5v14" />
          {:else}
            <path d="M8 5l11 7-11 7z" />
          {/if}
        </svg>
      </ControlButton>
      <SavedViewButton
        saved={savedCamera}
        width={paneWidth}
        height={paneHeight}
        onsave={onsavecamera}
        {onmenu}
        {onnotice}
      />
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
    <AutoScroll
      running={auto.running}
      direction={auto.direction}
      speed={autoSpeed}
      atEnd={autoAtEnd}
      {targets}
      {cardWidth}
      {cardHeight}
      width={paneWidth}
      height={paneHeight}
      onpause={(reason) => onauto({ type: "pause", reason })}
      onturn={(direction) => onauto({ type: "turn", direction })}
    />
    <FollowSelection {activeId} {searchId} {targets} {cardWidth} {cardHeight} width={paneWidth} height={paneHeight} />
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
