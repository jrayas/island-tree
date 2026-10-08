<script lang="ts">
  // The controls above the canvas. Holds no state of its own: it shows what App
  // tells it and reports clicks back, so the view state stays in one place.
  import type { LayoutMode } from "../layout/types";

  let {
    layoutMode,
    foldersOn,
    filesOn,
    query,
    canFocus,
    isFocused,
    onlayout,
    onfolders,
    onfiles,
    onreset,
    onquery,
    onfocus,
    onunfocus,
  }: {
    layoutMode: LayoutMode;
    foldersOn: boolean;
    filesOn: boolean;
    query: string;
    /** A folder is selected, so Focus selected can act. */
    canFocus: boolean;
    /** The view is focused on a folder other than the vault root. */
    isFocused: boolean;
    onlayout: (mode: LayoutMode) => void;
    onfolders: () => void;
    onfiles: () => void;
    onreset: () => void;
    onquery: (text: string) => void;
    onfocus: () => void;
    onunfocus: () => void;
  } = $props();
</script>

<div class="island-toolbar" role="toolbar" aria-label="Dashboard controls">
  <div class="island-toolbar-group" role="group" aria-label="Layout">
    <button
      type="button"
      class:is-active={layoutMode === "vertical"}
      aria-pressed={layoutMode === "vertical"}
      onclick={() => onlayout("vertical")}>Vertical</button
    >
    <button
      type="button"
      class:is-active={layoutMode === "radial"}
      aria-pressed={layoutMode === "radial"}
      onclick={() => onlayout("radial")}>Radial</button
    >
  </div>

  <div class="island-toolbar-group">
    <button type="button" class:is-active={foldersOn} aria-pressed={foldersOn} onclick={onfolders}
      >Expand folders</button
    >
    <button type="button" class:is-active={filesOn} aria-pressed={filesOn} onclick={onfiles}
      >Expand files</button
    >
    <button type="button" onclick={onreset}>Reset</button>
  </div>

  <input
    type="search"
    class="island-toolbar-search"
    placeholder="Search names"
    aria-label="Search names"
    spellcheck="false"
    value={query}
    oninput={(event) => onquery(event.currentTarget.value)}
  />

  <div class="island-toolbar-group">
    <button type="button" disabled={!canFocus} onclick={onfocus}>Focus selected</button>
    <button type="button" disabled={!isFocused} onclick={onunfocus}>Reset focus</button>
  </div>
</div>
