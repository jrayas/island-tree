<script lang="ts">
  // The controls above the canvas. Holds no state of its own: it shows what App
  // tells it and reports clicks back, so the view state stays in one place.
  import type { LayoutMode, MindMapView } from "../layout/types";

  let {
    layoutMode,
    mindMapView,
    foldersOn,
    filesOn,
    detailOn,
    query,
    canFocus,
    isFocused,
    onlayout,
    onmindmap,
    onfolders,
    onfiles,
    ondetail,
    onreset,
    onquery,
    onfocus,
    onunfocus,
  }: {
    layoutMode: LayoutMode;
    /** Which mind map view is chosen, shown on the Mind map button while that layout is on. */
    mindMapView: MindMapView;
    foldersOn: boolean;
    filesOn: boolean;
    detailOn: boolean;
    query: string;
    /** A folder is selected, so Focus selected can act. */
    canFocus: boolean;
    /** The view is focused on a folder other than the vault root. */
    isFocused: boolean;
    onlayout: (mode: "vertical" | "radial") => void;
    /** Selects the mind map layout, or, when it is already on, switches between its two views. */
    onmindmap: () => void;
    onfolders: () => void;
    onfiles: () => void;
    ondetail: () => void;
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
    <button
      type="button"
      class:is-active={layoutMode === "mindmap"}
      aria-pressed={layoutMode === "mindmap"}
      title="Click again to switch between the balanced and one-sided views"
      onclick={onmindmap}
      >{layoutMode === "mindmap"
        ? mindMapView === "balanced"
          ? "Mind map: balanced"
          : "Mind map: one-sided"
        : "Mind map"}</button
    >
  </div>

  <div class="island-toolbar-group">
    <button type="button" class:is-active={foldersOn} aria-pressed={foldersOn} onclick={onfolders}
      >Expand folders</button
    >
    <button type="button" class:is-active={filesOn} aria-pressed={filesOn} onclick={onfiles}
      >Expand files</button
    >
    <button type="button" class:is-active={detailOn} aria-pressed={detailOn} onclick={ondetail}
      >Details</button
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
