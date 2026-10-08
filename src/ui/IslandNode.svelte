<script lang="ts">
  // One card: a file, a folder (with its badge) or a "+N more" pill.
  // Styling lives in styles.css, so the release ships a single stylesheet.
  import { Handle, Position } from "@xyflow/svelte";
  import { icon } from "./icon";
  import type { CardData } from "./cardData";
  import { useCanvasActions } from "./context";

  let { id, data }: { id: string; data: CardData } = $props();
  const actions = useCanvasActions();

  const display = $derived(data.display);

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
  title={display.tooltip}
  ondblclick={open}
  role="presentation"
>
  <!-- Handles sit at the card centre and are invisible: branches are drawn between centres. -->
  <Handle type="target" position={Position.Top} class="island-handle" isConnectable={false} />
  {#if display.icon}
    <span
      class="island-card-icon"
      style:color={display.colour}
      use:icon={display.icon}
      aria-hidden="true"
    ></span>
  {/if}
  <span class="island-card-name">{display.label}</span>
  {#if display.kind === "folder"}
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
  <Handle type="source" position={Position.Bottom} class="island-handle" isConnectable={false} />
</div>
