<script lang="ts">
  // The controls above the canvas. Holds no state of its own: it shows what App
  // tells it and reports clicks back, so the view state stays in one place.
  import type { LayoutMode, MindMapView } from "../layout/types";

  let {
    layoutMode,
    mindMapView,
    compact,
    foldersOn,
    filesOn,
    detailOn,
    query,
    matches,
    canFocus,
    isFocused,
    locked,
    onlayout,
    onmindmap,
    ondensity,
    onfolders,
    onfiles,
    ondetail,
    onreset,
    onquery,
    onfocus,
    onunfocus,
    onlock,
  }: {
    layoutMode: LayoutMode;
    /** Which mind map view is chosen, shown on the Mind map button while that layout is on. */
    mindMapView: MindMapView;
    /** Compact density is on: smaller cards and tighter spacing. */
    compact: boolean;
    foldersOn: boolean;
    filesOn: boolean;
    detailOn: boolean;
    query: string;
    /** How many names match the search, or null when nothing is being searched for. */
    matches: number | null;
    /** A folder is selected, so Focus selected can act. */
    canFocus: boolean;
    /** The view is focused on a folder other than the vault root. */
    isFocused: boolean;
    /** Editing is locked. The button shows the state and flips it. */
    locked: boolean;
    onlayout: (mode: "vertical" | "radial") => void;
    /** Selects the mind map layout, or, when it is already on, switches between its two views. */
    onmindmap: () => void;
    /** Switches Compact on or off. */
    ondensity: () => void;
    onfolders: () => void;
    onfiles: () => void;
    ondetail: () => void;
    onreset: () => void;
    onquery: (text: string) => void;
    onfocus: () => void;
    onunfocus: () => void;
    onlock: () => void;
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
    <button
      type="button"
      class:is-active={compact}
      aria-pressed={compact}
      title={compact
        ? "Compact is on. Click to go back to your own card sizes."
        : "Draw smaller cards with tighter spacing, to fit more on screen."}
      onclick={ondensity}>Compact</button
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
  {#if matches !== null}
    <span class="island-search-count" aria-live="polite"
      >{matches === 0 ? "No matches" : matches === 1 ? "1 match" : `${matches.toLocaleString()} matches`}</span
    >
  {/if}

  <div class="island-toolbar-group">
    <button type="button" disabled={!canFocus} onclick={onfocus}>Focus selected</button>
    <button type="button" disabled={!isFocused} onclick={onunfocus}>Reset focus</button>
  </div>

  <div class="island-toolbar-group">
    <button
      type="button"
      class:is-active={!locked}
      aria-pressed={!locked}
      title={locked ? "Locked. Click to unlock editing." : "Unlocked. Click to lock again."}
      onclick={onlock}>{locked ? "Locked" : "Unlocked"}</button
    >
  </div>
</div>
