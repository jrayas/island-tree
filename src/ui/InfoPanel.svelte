<script lang="ts">
  // Details of the selected card, as plain text floating over the graph (see
  // styles.css). It fades in when something is selected and out when not. The last
  // text is kept while it fades, so the words do not vanish before the fade ends.
  import type { SelectionInfo } from "../model/info";

  let { info }: { info: SelectionInfo | null } = $props();

  let shown = $state<SelectionInfo | null>(null);
  $effect(() => {
    if (info) shown = info;
  });
</script>

<!-- Polite live region: screen readers hear the details when a card is selected. -->
<div class="island-info" class:is-visible={info !== null} aria-live="polite">
  {#if shown}
    <div class="island-info-title">{shown.title}</div>
    <div class="island-info-path">{shown.path}</div>
    <div class="island-info-line">{shown.details.join(" · ")}</div>
  {/if}
</div>
