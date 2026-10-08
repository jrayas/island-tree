<script lang="ts">
  // The folders from the vault root down to the focus. Every part but the last
  // is a button that moves the focus back up to it.
  let {
    crumbs,
    onselect,
  }: {
    crumbs: { uid: string; name: string }[];
    onselect: (uid: string) => void;
  } = $props();
</script>

<nav class="island-breadcrumb" aria-label="Focus path">
  {#each crumbs as crumb, index (crumb.uid)}
    {#if index > 0}<span class="island-breadcrumb-sep" aria-hidden="true">/</span>{/if}
    {#if index < crumbs.length - 1}
      <button type="button" class="island-breadcrumb-link" onclick={() => onselect(crumb.uid)}
        >{crumb.name}</button
      >
    {:else}
      <span class="island-breadcrumb-current" aria-current="location">{crumb.name}</span>
    {/if}
  {/each}
</nav>
