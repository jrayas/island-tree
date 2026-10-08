<script lang="ts">
  // Root component. Owns the vault tree and the view state, works out what is
  // visible and where it goes, and hands the canvas plain data. Click handling
  // is the only place the view state changes.
  import { untrack } from "svelte";
  import { describeItem } from "../model/display";
  import { ancestry, buildTree, indexTree, UidRegistry, type RawEntry } from "../model/tree";
  import { buildVisibleTree, flattenVisible } from "../model/visibility";
  import {
    createViewState,
    select,
    showAllFor,
    toggleFilesFor,
    toggleOpen,
    type ViewState,
  } from "../model/viewState";
  import { layoutVertical, type VerticalOptions } from "../layout/vertical";
  import type { CanvasItem } from "./cardData";
  import Canvas from "./Canvas.svelte";

  const { loadTree }: { loadTree: () => RawEntry } = $props();

  // Card sizes are fixed until the settings milestone makes them configurable.
  const SIZES: VerticalOptions = { cardWidth: 116, cardHeight: 40, gap: 14, levelGap: 44 };

  // The tree is read once when the view opens; live updates arrive in milestone 4.
  const root = untrack(() => buildTree(loadTree(), new UidRegistry()));
  const index = indexTree(root);

  let viewState = $state.raw<ViewState>(createViewState(root.uid));

  const visibleRoot = $derived(buildVisibleTree(root, viewState));
  const visible = $derived(flattenVisible(visibleRoot));
  const layout = $derived(layoutVertical(visibleRoot, SIZES));

  // The selected card and its ancestors, so the branch back to the root lights up.
  const highlighted = $derived.by(() => {
    const node = viewState.selected ? index.get(viewState.selected) : undefined;
    return new Set(node ? ancestry(node).map((n) => n.uid) : []);
  });

  const items = $derived<CanvasItem[]>(
    visible.map((item) => ({
      id: item.id,
      parentId: item.parentId,
      highlight: highlighted.has(item.id),
      data: {
        display: describeItem(item, viewState),
        selected: viewState.selected === item.id,
      },
    })),
  );

  function activate(id: string): void {
    const item = visible.find((candidate) => candidate.id === id);
    if (!item) return;
    if (item.kind === "more") {
      // The pill expands its parent's overflow; it is never selected.
      if (item.parentId) viewState = showAllFor(viewState, item.parentId);
      return;
    }
    // A folder click opens or closes it and selects it; a file click only selects.
    viewState = select(item.kind === "folder" ? toggleOpen(viewState, id) : viewState, id);
  }
</script>

<Canvas
  {items}
  targets={layout.positions}
  cardWidth={SIZES.cardWidth}
  cardHeight={SIZES.cardHeight}
  onnodeclick={activate}
  onbadge={(id) => (viewState = toggleFilesFor(viewState, id))}
/>
