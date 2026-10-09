<script lang="ts">
  // One card: a file, a folder (with its badge) or a "+N more" pill.
  // What it shows depends on the zoom: far out only a type colour and a short
  // name, close in the second row of details when Details is on.
  // Styling lives in styles.css, so the release ships a single stylesheet.
  import { Handle, Position } from "@xyflow/svelte";
  import { icon } from "./icon";
  import type { CardData } from "./cardData";
  import { useCanvasActions, useZoom } from "./context";

  let { id, data }: { id: string; data: CardData } = $props();
  const actions = useCanvasActions();
  const zoom = useZoom();

  const display = $derived(data.display);
  const minimal = $derived(zoom.level === "minimal");
  const showDetail = $derived(data.detail && zoom.level === "detailed" && display.kind !== "more");
  const row = $derived(data.row);

  function open(event: MouseEvent): void {
    actions.onopen(id, event);
  }

  function badgeClick(event: MouseEvent): void {
    // Keep the click from reaching the card, which would also open or close the folder.
    event.stopPropagation();
    actions.onbadge(id);
  }
</script>

<div
  class="island-card"
  class:island-card-folder={display.kind === "folder"}
  class:island-card-more={display.kind === "more"}
  class:island-card-selected={data.selected}
  class:island-card-hit={data.hit}
  class:island-card-dim={data.dim}
  class:island-card-compact={data.compact}
  class:island-card-minimal={minimal}
  class:island-card-draggable={data.draggable}
  class:nopan={data.draggable}
  title={display.tooltip}
  ondblclick={open}
  onpointerdown={(event) => {
    if (data.draggable) actions.ondragstart(id, event);
  }}
  oncontextmenu={(event) => {
    event.preventDefault();
    actions.oncontext(id, event);
  }}
  role="presentation"
>
  <!-- Handles sit at the card centre and are invisible: branches are drawn between centres. -->
  <Handle type="target" position={Position.Top} class="island-handle" isConnectable={false} />
  <div class="island-card-row">
    {#if minimal && display.kind !== "more"}
      <span
        class="island-card-swatch"
        style:background={display.colour ?? "var(--interactive-accent)"}
        aria-hidden="true"
      ></span>
    {:else if display.icon}
      <span
        class="island-card-icon"
        style:color={display.colour}
        use:icon={display.icon}
        aria-hidden="true"
      ></span>
    {/if}
    <span class="island-card-name">{display.label}</span>
    {#if display.kind === "folder" && !minimal}
      <button
        type="button"
        class="island-card-badge"
        class:island-card-badge-on={display.filesShown}
        aria-label={display.tooltip}
        onclick={badgeClick}
        onpointerdown={(event) => event.stopPropagation()}
        ondblclick={(event) => event.stopPropagation()}
      >{display.subfolders}·{display.files}</button>
    {/if}
  </div>
  {#if showDetail && display.kind === "folder"}
    <div class="island-card-meta">
      <span>{display.items} {display.items === 1 ? "item" : "items"}</span>
    </div>
  {:else if showDetail && row}
    <div class="island-card-meta">
      {#if row.dot}
        <span class="island-dot island-dot-{row.dot}" aria-hidden="true"></span>
      {/if}
      {#if row.text}<span>{row.text}</span>{/if}
      {#if row.status}
        <span class="island-chip island-chip-{row.status.kind}">{row.status.label}</span>
      {/if}
    </div>
  {/if}
  <Handle type="source" position={Position.Bottom} class="island-handle" isConnectable={false} />
</div>
