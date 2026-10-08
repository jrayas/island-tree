<script lang="ts">
  // Details of the selected card. Announced politely so screen readers hear changes.
  import { NOTHING_SELECTED, type SelectionInfo } from "../model/info";

  let { info }: { info: SelectionInfo | null } = $props();
</script>

<div class="island-info" aria-live="polite">
  {#if info}
    <div class="island-info-title">{info.title}</div>
    <div class="island-info-path">{info.path}</div>
    {#each info.details as line (line)}
      <div class="island-info-line">{line}</div>
    {/each}
  {:else}
    <div class="island-info-line">{NOTHING_SELECTED}</div>
  {/if}
</div>
