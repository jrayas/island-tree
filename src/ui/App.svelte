<script lang="ts">
  // Root component. Owns the vault tree and the view state, works out what is
  // visible and where it goes, and hands the canvas plain data. The handlers
  // below are the only places the view state changes.
  import { untrack } from "svelte";
  import { openTarget, type OpenTarget } from "../actions/target";
  import { computeLayout } from "../layout/layout";
  import type { LayoutMode } from "../layout/types";
  import { describeItem } from "../model/display";
  import { describeSelection } from "../model/info";
  import { describeMeta, type FileMeta, type MetaDisplay } from "../model/meta";
  import { isDimmed, searchTree, withSearchReveal } from "../model/search";
  import { reconcileViewState } from "../model/sync";
  import type { VaultWatchHandlers } from "../model/watch";
  import {
    ancestry,
    buildTree,
    folderUids,
    indexTree,
    UidRegistry,
    type RawEntry,
  } from "../model/tree";
  import { buildVisibleTree, flattenVisible } from "../model/visibility";
  import {
    createViewState,
    focusOn,
    resetFocus,
    resetView,
    select,
    setDetail,
    setFilesOn,
    setFoldersOn,
    setLayout,
    setQuery,
    showAllFor,
    toggleFilesFor,
    toggleOpen,
    type ViewState,
  } from "../model/viewState";
  import Breadcrumb from "./Breadcrumb.svelte";
  import Canvas from "./Canvas.svelte";
  import type { CanvasItem } from "./cardData";
  import InfoPanel from "./InfoPanel.svelte";
  import Toolbar from "./Toolbar.svelte";

  const {
    loadTree,
    readMeta,
    watchVault,
    openFile,
    initialLayout,
  }: {
    loadTree: () => RawEntry;
    /** Details for a file, or null when they are not known. */
    readMeta: (path: string) => FileMeta | null;
    /** Starts listening for vault changes and returns a function that stops. */
    watchVault: (handlers: VaultWatchHandlers) => () => void;
    openFile: (path: string, target: OpenTarget) => void;
    initialLayout: LayoutMode;
  } = $props();

  // Ids stay the same for the same path across rebuilds, and follow a file when it moves.
  const registry = new UidRegistry();
  let root = $state.raw(untrack(() => buildTree(loadTree(), registry)));
  const index = $derived(indexTree(root));
  const allFolders = $derived(folderUids(root));
  // Bumped when details may have changed, so cards re-read them.
  let metaVersion = $state(0);

  let viewState = $state.raw<ViewState>(untrack(() => createViewState(root.uid, initialLayout)));
  // Bumped whenever the camera should re-frame the cards: layout, focus and reset,
  // but not folder clicks, so the view does not jump while browsing.
  let fitKey = $state(0);

  const search = $derived(searchTree(root, viewState.query));
  // The search reveals matches without touching the saved state, so clearing it restores the view.
  const effective = $derived(withSearchReveal(viewState, search));
  const focusNode = $derived(index.get(viewState.focusRoot) ?? root);
  const visibleRoot = $derived(buildVisibleTree(focusNode, effective));
  const visible = $derived(flattenVisible(visibleRoot));
  const placed = $derived(computeLayout(viewState.layoutMode, visibleRoot, viewState.detail));

  const selectedNode = $derived(viewState.selected ? index.get(viewState.selected) : undefined);

  // The selected card and its ancestors, so the branch back to the root lights up.
  const highlighted = $derived(
    new Set(selectedNode ? ancestry(selectedNode).map((n) => n.uid) : []),
  );

  /** File details worded for display. Reading `metaVersion` makes it refresh after changes. */
  function metaFor(node: { kind: string; path: string } | null | undefined): MetaDisplay | null {
    void metaVersion;
    if (!node || node.kind !== "file") return null;
    const meta = readMeta(node.path);
    return meta ? describeMeta(meta, Date.now()) : null;
  }

  const items = $derived<CanvasItem[]>(
    visible.map((item) => {
      const meta = metaFor(item.node);
      return {
        id: item.id,
        parentId: item.parentId,
        highlight: highlighted.has(item.id),
        data: {
          display: describeItem(item, effective, meta),
          selected: viewState.selected === item.id,
          hit: search?.hits.has(item.id) ?? false,
          dim: isDimmed(item.id, search),
          compact: viewState.layoutMode === "radial",
          detail: viewState.detail,
          meta,
        },
      };
    }),
  );

  const crumbs = $derived(ancestry(focusNode).map((n) => ({ uid: n.uid, name: n.name })));

  // The tree is rebuilt whenever files are created, deleted or moved. The view
  // state is then tidied so it never points at cards that have gone.
  function refreshStructure(): void {
    const previousFolders = new Set(allFolders);
    const next = buildTree(loadTree(), registry);
    viewState = reconcileViewState(
      viewState,
      new Set(indexTree(next).keys()),
      folderUids(next),
      previousFolders,
      next.uid,
    );
    root = next;
    metaVersion += 1;
  }

  $effect(() =>
    watchVault({
      onStructure: refreshStructure,
      onMetadata: () => (metaVersion += 1),
      onRename: (oldPath, newPath) => registry.moved(oldPath, newPath),
    }),
  );

  function refit(): void {
    fitKey += 1;
  }

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

  function openCard(id: string, modifiers: { ctrlKey: boolean; metaKey: boolean }): void {
    const node = visible.find((candidate) => candidate.id === id)?.node;
    if (!node) return;
    if (node.kind === "folder") {
      viewState = focusOn(viewState, id);
      refit();
    } else {
      openFile(node.path, openTarget(modifiers));
    }
  }

  function focusSelected(): void {
    if (selectedNode?.kind !== "folder") return;
    viewState = focusOn(viewState, selectedNode.uid);
    refit();
  }

  function focusCrumb(uid: string): void {
    viewState = uid === root.uid ? resetFocus(viewState, root.uid) : focusOn(viewState, uid);
    refit();
  }
</script>

<div class="island-app">
  <Toolbar
    layoutMode={viewState.layoutMode}
    foldersOn={viewState.foldersOn}
    filesOn={viewState.filesOn}
    detailOn={viewState.detail}
    query={viewState.query}
    canFocus={selectedNode?.kind === "folder"}
    isFocused={viewState.focusRoot !== root.uid}
    onlayout={(mode) => {
      viewState = setLayout(viewState, mode);
      refit();
    }}
    onfolders={() =>
      (viewState = setFoldersOn(viewState, !viewState.foldersOn, allFolders, root.uid))}
    onfiles={() => (viewState = setFilesOn(viewState, !viewState.filesOn))}
    ondetail={() => {
      viewState = setDetail(viewState, !viewState.detail);
      refit();
    }}
    onreset={() => {
      viewState = resetView(viewState, root.uid);
      refit();
    }}
    onquery={(text) => (viewState = setQuery(viewState, text, root.uid))}
    onfocus={focusSelected}
    onunfocus={() => {
      viewState = resetFocus(viewState, root.uid);
      refit();
    }}
  />
  <Breadcrumb {crumbs} onselect={focusCrumb} />
  <Canvas
    {items}
    targets={placed.positions}
    cardWidth={placed.cardSize.width}
    cardHeight={placed.cardSize.height}
    radialCentre={placed.centre}
    {fitKey}
    onnodeclick={activate}
    onbadge={(id) => (viewState = toggleFilesFor(viewState, id))}
    onopen={openCard}
  />
  <InfoPanel info={describeSelection(selectedNode ?? null, metaFor(selectedNode))} />
</div>
