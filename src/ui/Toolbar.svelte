<script lang="ts">
  // The controls above the canvas. It shows what App tells it and reports clicks back, so the view
  // state stays in one place. The only state it keeps is the search box's own: whether the list of
  // suggestions is open and which one is lit.
  import type { LayoutMode, MindMapView } from "../layout/types";
  import type { Suggestions } from "../model/suggest";
  import { icon } from "./icon";

  let {
    layoutMode,
    mindMapView,
    compact,
    foldersOn,
    canExpandMore,
    filesOn,
    detailOn,
    query,
    suggestions,
    searchFiles,
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
    onpick,
    onsearchfiles,
    onsearchenter,
    onsearchescape,
    onsearchfocus,
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
    /** Some folder on screen is still closed, so Expand folders opens another level. */
    canExpandMore: boolean;
    filesOn: boolean;
    detailOn: boolean;
    query: string;
    /** What the search suggests for the text typed, or null when nothing is typed. */
    suggestions: Suggestions | null;
    /** The search also lists files, by exact name. */
    searchFiles: boolean;
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
    /** A suggestion was chosen (by Enter or a click): go to that one card. */
    onpick: (uid: string) => void;
    /** Switches searching files on or off. */
    onsearchfiles: () => void;
    /** Enter was pressed in the search box with nothing to go to. */
    onsearchenter: () => void;
    /** Escape was pressed in the search box: give the keyboard back to the dashboard, keeping the text. */
    onsearchescape: () => void;
    /** The search box got the keyboard. */
    onsearchfocus: () => void;
    onfocus: () => void;
    onunfocus: () => void;
    onlock: () => void;
  } = $props();

  const listId = $props.id();
  let open = $state(false);
  let lit = $state(0);

  const items = $derived(suggestions?.items ?? []);
  // Clamp rather than reset, so the lit row survives the list changing under it while you type.
  const active = $derived(Math.min(lit, Math.max(0, items.length - 1)));
  const showList = $derived(open && items.length > 0);

  // The list opens under the box, aligned to its left edge. Near the right edge of the window it
  // aligns to the right instead, so it is never cut off.
  let searchEl = $state<HTMLDivElement>();
  let alignEnd = $state(false);
  const LIST_WIDTH = 480;
  $effect(() => {
    if (!showList || !searchEl) return;
    const room = searchEl.ownerDocument.documentElement.clientWidth - searchEl.getBoundingClientRect().left;
    alignEnd = room < LIST_WIDTH;
  });

  function pick(uid: string): void {
    open = false;
    onpick(uid);
  }

  function searchKey(event: KeyboardEvent): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (items.length === 0) return;
      event.preventDefault();
      if (!open) {
        open = true;
        return;
      }
      lit = (active + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = items[active];
      if (chosen) pick(chosen.uid);
      else onsearchenter();
    } else if (event.key === "Escape") {
      // A search box would clear itself on Escape. Here the first press closes the list, and the next
      // hands the keyboard back to the dashboard, keeping the text.
      event.preventDefault();
      if (open) open = false;
      else onsearchescape();
    } else if (event.key === "Tab") {
      open = false;
    }
  }

  /** The name with its matched parts picked out, as pieces to draw. */
  function pieces(name: string, marks: [number, number][]): { text: string; mark: boolean }[] {
    const out: { text: string; mark: boolean }[] = [];
    let at = 0;
    for (const [start, end] of marks) {
      if (start > at) out.push({ text: name.slice(at, start), mark: false });
      out.push({ text: name.slice(start, end), mark: true });
      at = end;
    }
    if (at < name.length) out.push({ text: name.slice(at), mark: false });
    return out;
  }
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
    <button
      type="button"
      class:is-active={foldersOn}
      aria-pressed={foldersOn}
      title={foldersOn && !canExpandMore
        ? "Every folder on screen is open. Click to close them all."
        : "Open the next level of folders. Click again for the level after."}
      onclick={onfolders}>{foldersOn && !canExpandMore ? "Collapse folders" : "Expand folders"}</button
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

  <div class="island-search" bind:this={searchEl}>
    <input
      type="search"
      class="island-toolbar-search"
      placeholder={searchFiles ? "Find a folder or file" : "Find a folder"}
      aria-label="Find a folder or file"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={showList}
      aria-controls={listId}
      aria-activedescendant={showList ? `${listId}-${active}` : undefined}
      spellcheck="false"
      autocomplete="off"
      value={query}
      oninput={(event) => {
        lit = 0;
        open = true;
        onquery(event.currentTarget.value);
      }}
      onfocus={() => {
        open = true;
        onsearchfocus();
      }}
      onblur={() => (open = false)}
      onkeydown={searchKey}
    />
    {#if showList}
      <ul class="island-suggestions" class:is-end={alignEnd} role="listbox" id={listId} aria-label="Suggestions">
        {#each items as item, position (item.uid)}
          <!-- Pressing keeps the keyboard in the box, so a click picks before the box loses focus. -->
          <li
            id="{listId}-{position}"
            role="option"
            aria-selected={position === active}
            class="island-suggestion"
            class:is-active={position === active}
            onpointerdown={(event) => {
              event.preventDefault();
              pick(item.uid);
            }}
            onpointermove={() => (lit = position)}
          >
            <span class="island-suggestion-icon" use:icon={item.kind === "folder" ? "folder" : "file"} aria-hidden="true"></span>
            <span class="island-suggestion-text">
              <span class="island-suggestion-name"
                >{#each pieces(item.name, item.marks) as part}{#if part.mark}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}</span
              >
              <span class="island-suggestion-where">{item.where}</span>
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <button
    type="button"
    class="island-search-files"
    class:is-active={searchFiles}
    aria-pressed={searchFiles}
    title="Also find files, by exact name. Only the one you choose is loaded."
    onclick={onsearchfiles}>Files</button
  >
  {#if suggestions !== null}
    <span class="island-search-count" aria-live="polite"
      >{suggestions.total === 0
        ? "No matches"
        : suggestions.total <= items.length
          ? suggestions.total === 1
            ? "1 match"
            : `${suggestions.total} matches`
          : `${items.length} of ${suggestions.total.toLocaleString("en-GB")}`}</span
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
