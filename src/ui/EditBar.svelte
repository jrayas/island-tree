<script lang="ts">
  // The editing bar, shown only while the dashboard is unlocked. It acts on the selected
  // card; like the toolbar it holds no state and just reports clicks back to the app.
  let {
    target,
    canRename,
    canDelete,
    onrename,
    onnote,
    onfolder,
    ondelete,
  }: {
    /** The selected card's name, or null when nothing is selected. */
    target: string | null;
    /** A card other than the vault itself is selected. */
    canRename: boolean;
    canDelete: boolean;
    onrename: () => void;
    onnote: () => void;
    onfolder: () => void;
    ondelete: () => void;
  } = $props();
</script>

<div class="island-editbar" role="toolbar" aria-label="Editing">
  <span class="island-editbar-target">{target ?? "Select a card to edit it"}</span>
  <button type="button" disabled={!canRename} onclick={onrename}>Rename</button>
  <button type="button" onclick={onnote}>New note</button>
  <button type="button" onclick={onfolder}>New folder</button>
  <button type="button" class="mod-warning" disabled={!canDelete} onclick={ondelete}>Delete</button>
</div>
