<script lang="ts">
  // Root component. Owns the vault tree and the view state, works out what is
  // visible and where it goes, and hands the canvas plain data. The handlers
  // below are the only places the view state changes. Settings arrive through a
  // store, so changing one in the settings page restyles and re-lays out an open
  // dashboard at once.
  import { onDestroy, tick, untrack } from "svelte";
  import { openTarget, type OpenTarget } from "../actions/target";
  import { parseSavedView, restoreView, saveView, type SavedView } from "../model/savedView";
  import type { EditTarget, EditingApi, LockBridge } from "../editing/api";
  import { joinPath, relockDue } from "../editing/rules";
  import { CountCache, indexByPath } from "../model/counts";
  import { COUNT_CHUNK, SEARCH_DELAY_MS, SUGGESTION_LIMIT } from "../model/limits";
  import { nextAutoScroll, type AutoScrollAction, type AutoScrollState } from "../layout/autoScroll";
  import { withCamera, type SavedCameras } from "../layout/camera";
  import { computeLayout, type LayoutOptions } from "../layout/layout";
  import { describeForReader, describeItem } from "../model/display";
  import { NAV_KEYS, navigate, type NavItem } from "../model/keyNav";
  import { describeSelection } from "../model/info";
  import { cardRow, describeMeta, type FileMeta, type MetaDisplay } from "../model/meta";
  import { revealOne } from "../model/reveal";
  import { isDimmed, matchVisible } from "../model/search";
  import { suggest } from "../model/suggest";
  import { withDensity } from "../settings/density";
  import { findField, withFieldValue } from "../settings/schema";
  import type { SettingsStore } from "../settings/store";
  import { reconcileViewState } from "../model/sync";
  import type { VaultWatchHandlers } from "../model/watch";
  import {
    ancestry,
    buildTree,
    indexTree,
    UidRegistry,
    type RawEntry,
    type TreeNode,
  } from "../model/tree";
  import { buildVisibleTree, filesVisible, flattenVisible, nextBatchFor } from "../model/visibility";
  import {
    focusOn,
    collapseFolders,
    expandLevel,
    filesCanExpand,
    initialViewState,
    resetFocus,
    restartView,
    select,
    setDetail,
    setFilesOn,
    setLayout,
    setQuery,
    revealBatch,
    showFolderContents,
    toggleFilesFor,
    toggleOpen,
    viewing,
    type StartOptions,
    type ViewState,
  } from "../model/viewState";
  import Breadcrumb from "./Breadcrumb.svelte";
  import Canvas from "./Canvas.svelte";
  import EditBar from "./EditBar.svelte";
  import type { CanvasItem } from "./cardData";
  import InfoPanel from "./InfoPanel.svelte";
  import type { ScrollBridge } from "./scrollBridge";
  import type { StateBridge } from "./stateBridge";
  import Toolbar from "./Toolbar.svelte";

  const {
    loadTree,
    readMeta,
    watchVault,
    openFile,
    settings,
    editing,
    lockBridge,
    scrollBridge,
    stateBridge,
    initialView = null,
  }: {
    loadTree: () => RawEntry;
    /** Details for a file, or null when they are not known. */
    readMeta: (path: string) => FileMeta | null;
    /** Starts listening for vault changes and returns a function that stops. */
    watchVault: (handlers: VaultWatchHandlers) => () => void;
    openFile: (path: string, target: OpenTarget) => void;
    settings: SettingsStore;
    /** Renaming, creating, deleting and moving, through Obsidian's file APIs. */
    editing: EditingApi;
    /** Lets the "Toggle lock" command reach this app. */
    lockBridge: LockBridge;
    /** Lets the "Toggle auto-scroll" command reach this app. */
    scrollBridge: ScrollBridge;
    /** Lets the view save and restore how the dashboard was left. */
    stateBridge: StateBridge;
    /** How the dashboard was left last time, if Obsidian handed it back. */
    initialView?: SavedView | null;
  } = $props();

  // The live settings. Reading `cfg` in a derived value makes it follow changes.
  let cfg = $state.raw(untrack(() => settings.get()));
  $effect(() =>
    settings.subscribe((next) => {
      cfg = next;
    }),
  );

  // Ids stay the same for the same path across rebuilds, and follow a file when it moves.
  const registry = new UidRegistry();
  let root = $state.raw(untrack(() => buildTree(loadTree(), registry)));
  const index = $derived(indexTree(root));
  // Bumped when details may have changed, so cards re-read them.
  let metaVersion = $state(0);

  // Folder and file counts, kept by path. They are never worked out again while you zoom, hover or
  // click: the whole-vault count runs in slices after the first draw, and a change updates only the
  // folders above it.
  const counts = new CountCache();
  let countsVersion = $state(0);
  let countsRun = 0;
  async function countVault(tree: TreeNode): Promise<void> {
    const run = ++countsRun;
    const finished = await counts.build(tree, {
      chunk: COUNT_CHUNK,
      yieldNow: () => new Promise<void>((resolve) => window.setTimeout(resolve, 0)),
      shouldStop: () => run !== countsRun,
    });
    if (finished && run === countsRun) countsVersion += 1;
  }
  // The first draw does not wait for it. Closing the dashboard abandons it.
  $effect(() => {
    const handle = window.setTimeout(() => void countVault(untrack(() => root)), 0);
    return () => {
      window.clearTimeout(handle);
      countsRun += 1;
    };
  });

  /** What the dashboard should start with, from the "start with" settings. */
  /** The folders directly in the vault, which "start with the first level open" opens. */
  function firstLevel(tree: TreeNode): string[] {
    return tree.children
      .filter((child) => child.kind === "folder")
      .slice(0, cfg.layout.overflowLimit)
      .map((child) => child.uid);
  }

  function startOptions(): StartOptions {
    return {
      layoutMode: cfg.layout.defaultLayout,
      detail: cfg.cards.startDetailed,
      expandFolders: cfg.layout.startExpandFolders,
      expandFiles: cfg.layout.startExpandFiles,
    };
  }

  /** The saved state put on top of a starting state; paths no longer in the vault are ignored. */
  function restored(saved: SavedView, tree: TreeNode, base: ViewState): ViewState {
    const known = indexTree(tree);
    return restoreView(
      saved,
      (path) => {
        const uid = registry.find(path);
        return uid !== undefined && known.has(uid) ? uid : undefined;
      },
      base,
      tree.uid,
    );
  }

  let viewState = $state.raw<ViewState>(
    untrack(() => {
      const start = initialViewState(root.uid, firstLevel(root), startOptions());
      const saved = parseSavedView(initialView);
      return saved ? restored(saved, root, start) : start;
    }),
  );
  // Bumped whenever the camera should re-frame the cards: layout, focus and reset,
  // or a setting that changes card sizes or spacing, but not folder clicks, so the
  // view does not jump while browsing.
  let fitKey = $state(0);

  // The views saved with the Saved view button, one per layout. They only move the camera, so Reset,
  // the layout and the open folders never touch them.
  let cameras = $state.raw<SavedCameras>(untrack(() => parseSavedView(initialView)?.cameras ?? {}));

  // Remembering how the dashboard was left: Obsidian asks for a snapshot when this tab navigates
  // to a note (so Back can return) and when it saves the layout, and hands one back afterwards.
  $effect(() => {
    stateBridge.snapshot = () => saveView(viewState, (uid) => index.get(uid)?.path, cameras);
    stateBridge.restore = (saved) => {
      viewState = restored(saved, root, initialViewState(root.uid, firstLevel(root), startOptions()));
      cameras = saved.cameras ?? {};
      fitKey += 1;
    };
    return () => {
      stateBridge.snapshot = null;
      stateBridge.restore = null;
    };
  });
  // Ask Obsidian to save the layout whenever the view changes, so a restart brings it back too.
  $effect(() => {
    void viewState;
    void cameras;
    untrack(() => stateBridge.changed?.());
  });

  // What is drawn: the settings, with the sizes lowered when Compact is on. The saved settings stay
  // as they are, so turning Compact off restores them exactly.
  const drawn = $derived(withDensity(cfg));
  const layoutOptions = $derived<LayoutOptions>({
    cardWidth: drawn.cards.width,
    cardHeight: drawn.cards.height,
    gap: drawn.layout.gap,
    levelGap: drawn.layout.levelGap,
    ringRadius: drawn.layout.ringRadius,
    ringStep: drawn.layout.ringStep,
    mindMapView: drawn.layout.mindMapView,
  });
  const layoutKey = $derived(JSON.stringify(layoutOptions));
  let lastLayoutKey = untrack(() => layoutKey);
  $effect(() => {
    if (layoutKey === lastLayoutKey) return;
    lastLayoutKey = layoutKey;
    fitKey += 1;
  });

  // A new status property name means every card's status must be read again.
  let lastStatusProperty = untrack(() => cfg.cards.statusProperty);
  $effect(() => {
    if (cfg.cards.statusProperty === lastStatusProperty) return;
    lastStatusProperty = cfg.cards.statusProperty;
    metaVersion += 1;
  });

  // What is typed shows at once and drives the suggestions, which look through names in memory only.
  // Marking the matching cards that are already on screen waits a moment after typing stops.
  let typed = $state(untrack(() => viewState.query));
  let searchTimer = 0;
  // The card the last search went to. It alone gets the highlight, until something else is selected
  // or something is typed.
  let found = $state<string | null>(null);
  $effect(() => {
    if (found !== null && viewState.selected !== found) untrack(() => (found = null));
  });
  function typeQuery(text: string): void {
    typed = text;
    found = null;
    window.clearTimeout(searchTimer);
    const apply = (): void => {
      searchTimer = 0;
      viewState = setQuery(viewState, text);
    };
    // Clearing the box is cheap and should feel instant.
    if (text.trim() === "") apply();
    else searchTimer = window.setTimeout(apply, SEARCH_DELAY_MS);
  }
  // A state handed back (Back, restore) or a reset changes the query from outside the box.
  $effect(() => {
    const query = viewState.query;
    if (!searchTimer) untrack(() => (typed = query));
  });
  onDestroy(() => window.clearTimeout(searchTimer));

  // The best few folders (and, with Files on, files by exact name) for what is typed. It never loads
  // a card: choosing one goes to that card alone.
  const suggestions = $derived(
    typed.trim() === "" ? null : suggest(root, typed, { files: cfg.layout.searchFiles, limit: SUGGESTION_LIMIT }),
  );
  const focusNode = $derived(index.get(viewState.focusRoot) ?? root);
  // What is drawn from: the view state, with Expand files ignored at the vault root (it only works when focused).
  const shown = $derived(viewing(viewState, root.uid));
  const visibleRoot = $derived(buildVisibleTree(focusNode, shown, cfg.layout.overflowLimit));
  const visible = $derived(flattenVisible(visibleRoot));
  const placed = $derived(
    computeLayout(viewState.layoutMode, visibleRoot, viewState.detail, layoutOptions),
  );

  const selectedNode = $derived(viewState.selected ? index.get(viewState.selected) : undefined);

  // The selected card and its ancestors, so the branch back to the root lights up.
  const highlighted = $derived(
    new Set(selectedNode ? ancestry(selectedNode).map((n) => n.uid) : []),
  );

  // The cards on screen that match what is typed, which get the highlight (and the dim, if it is on).
  const match = $derived(matchVisible(visible, viewState.query));

  /**
   * A suggestion was chosen (Enter or a click): go to that one card. Its folders open and it is
   * selected, so Focus selected, the editing bar and the keyboard all work on it, and the camera
   * follows the selection. Nothing else that matches the text is loaded, and the box is cleared.
   */
  let appEl = $state<HTMLDivElement>();
  async function pickCard(uid: string): Promise<void> {
    const node = index.get(uid);
    if (!node) return;
    window.clearTimeout(searchTimer);
    searchTimer = 0;
    viewState = revealOne(setQuery(viewState, ""), node);
    typed = "";
    found = node.uid;
    await tick();
    focusCanvas();
  }

  /** Enter with nothing to go to: say why, and hand the keyboard back when the box is empty. */
  function nothingToGoTo(): void {
    const text = typed.trim();
    if (text === "") {
      focusCanvas();
      return;
    }
    editing.notify(
      cfg.layout.searchFiles
        ? `Nothing is named "${text}".`
        : `No folder matches "${text}". Turn on Files to look for a file by its exact name.`,
    );
  }

  /** The Files button: whether the search also finds files, by exact name. The setting remembers it. */
  function toggleSearchFiles(): void {
    const field = findField("layout.searchFiles");
    if (!field) return;
    settings.update((current) => withFieldValue(current, field, !cfg.layout.searchFiles));
  }

  /** Moves the keyboard to the dashboard, so its shortcuts (arrows, Shift and Space) work again. */
  function focusCanvas(): void {
    appEl?.querySelector<HTMLElement>(".island-canvas")?.focus();
  }

  /** File details worded for display. Reading `metaVersion` makes it refresh after changes. */
  function metaFor(node: { kind: string; path: string } | null | undefined): MetaDisplay | null {
    void metaVersion;
    if (!node || node.kind !== "file") return null;
    const meta = readMeta(node.path);
    return meta ? describeMeta(meta, Date.now()) : null;
  }

  const items = $derived<CanvasItem[]>(
    (() => {
      // Parents come before children, so a card's depth is its parent's plus one.
      const levels = new Map<string, number>();
      return visible.map((item) => {
      const meta = metaFor(item.node);
      const level = item.parentId === null ? 1 : (levels.get(item.parentId) ?? 0) + 1;
      levels.set(item.id, level);
      void countsVersion;
      const display = describeItem(
        item,
        shown,
        meta,
        { tags: cfg.cards.showTags },
        item.node?.kind === "folder" ? counts.countsFor(item.node) : undefined,
      );
      return {
        id: item.id,
        parentId: item.parentId,
        highlight: highlighted.has(item.id),
        data: {
          display,
          reader: describeForReader(display),
          level,
          selected: viewState.selected === item.id,
          hit: found === item.id || (match?.hits.has(item.id) ?? false),
          dim: cfg.layout.dimOnSearch && isDimmed(item.id, match),
          compact: viewState.layoutMode === "radial",
          draggable:
            !locked && cfg.editing.allowDrag && item.kind !== "more" && item.id !== root.uid,
          detail: viewState.detail,
          row: meta
            ? cardRow(meta, {
                age: cfg.cards.showAge,
                size: cfg.cards.showSize,
                links: cfg.cards.showLinks,
                status: cfg.cards.showStatus,
              })
            : null,
        },
      };
      });
    })(),
  );

  const crumbs = $derived(ancestry(focusNode).map((n) => ({ uid: n.uid, name: n.name })));

  // The tree is rebuilt whenever files are created, deleted or moved. The view
  // state is then tidied so it never points at cards that have gone.
  function refreshStructure(changed: readonly string[]): void {
    const next = buildTree(loadTree(), registry);
    viewState = reconcileViewState(viewState, new Set(indexTree(next).keys()), next.uid);
    // Update the counts above each change; if the first whole-vault count has not finished, redo it.
    if (counts.ready) {
      counts.applyChanges(indexByPath(next), changed);
      countsVersion += 1;
    } else {
      void countVault(next);
    }
    root = next;
    metaVersion += 1;
    const known = indexTree(next);
    selectPending(known);
    revealPending(known);
  }

  /** Reveals the batch of its folder's children that holds a card, so the card is not hidden behind "+N more". */
  function revealCard(known: ReadonlyMap<string, TreeNode>, uid: string): void {
    const node = known.get(uid);
    const parent = node?.parent;
    if (!node || !parent) return;
    const position = parent.children.indexOf(node);
    viewState = revealBatch(viewState, parent.uid, Math.floor(position / cfg.layout.overflowLimit));
  }

  /** A note or folder just created from here is selected as soon as its card exists, in view. */
  function selectPending(known: ReadonlyMap<string, TreeNode>): void {
    if (!pendingSelect) return;
    const uid = registry.uidFor(pendingSelect);
    if (!known.has(uid)) return;
    revealCard(known, uid);
    viewState = select(viewState, uid);
    pendingSelect = null;
  }

  /** A card just moved here from this dashboard is shown, in view, once it exists. */
  function revealPending(known: ReadonlyMap<string, TreeNode>): void {
    if (!pendingReveal) return;
    const uid = registry.uidFor(pendingReveal);
    if (!known.has(uid)) return;
    revealCard(known, uid);
    pendingReveal = null;
  }

  $effect(() =>
    watchVault({
      onStructure: refreshStructure,
      onMetadata: () => (metaVersion += 1),
      onRename: (oldPath, newPath) => registry.moved(oldPath, newPath),
    }),
  );

  // ---- Editing. The dashboard starts locked; while locked nothing here does anything.
  let locked = $state(untrack(() => cfg.editing.startLocked));
  let lastEditAt = Date.now();
  let pendingSelect: string | null = null;
  let pendingReveal: string | null = null;

  function toggleLock(): void {
    locked = !locked;
    if (!locked) lastEditAt = Date.now();
  }

  $effect(() => {
    lockBridge.toggle = toggleLock;
    return () => {
      lockBridge.toggle = null;
    };
  });

  // ---- Auto-scroll. Not saved with the view: each dashboard starts from the settings. It never
  // starts by itself when the system asks for reduced motion.
  let auto = $state<AutoScrollState>(
    untrack(() => ({
      running: cfg.canvas.autoScrollOnOpen && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      direction: cfg.canvas.autoScrollDirection,
    })),
  );

  function driveAuto(action: AutoScrollAction): void {
    const next = nextAutoScroll(auto, action);
    if (next.running !== auto.running || next.direction !== auto.direction) auto = next;
    if (action.type === "pause" && action.reason === "fits") {
      editing.notify("Everything is already on screen, so there is nothing to scroll.");
    } else if (action.type === "pause" && action.reason === "edge") {
      editing.notify("Already at the end. Turn it round with Shift and an arrow key.");
    }
  }

  // Changing the direction setting points auto-scroll that way straight away.
  $effect(() => {
    const direction = cfg.canvas.autoScrollDirection;
    untrack(() => {
      if (auto.direction !== direction) auto = { ...auto, direction };
    });
  });

  $effect(() => {
    scrollBridge.toggle = () => driveAuto({ type: "toggle" });
    return () => {
      scrollBridge.toggle = null;
    };
  });

  // Locks again after the chosen minutes without an edit (0 means never).
  $effect(() => {
    const minutes = cfg.editing.autoRelockMinutes;
    if (locked || minutes <= 0) return;
    const timer = window.setInterval(() => {
      if (!relockDue(lastEditAt, Date.now(), minutes)) return;
      locked = true;
      editing.notify(`Locked again after ${minutes} ${minutes === 1 ? "minute" : "minutes"} without changes.`);
    }, 10_000);
    return () => window.clearInterval(timer);
  });

  function targetOf(node: TreeNode): EditTarget {
    return { path: node.path, name: node.name, kind: node.kind };
  }

  const canEditSelected = $derived(selectedNode !== undefined && selectedNode.uid !== root.uid);

  async function renameNode(node: TreeNode | undefined): Promise<void> {
    if (locked || !node || node.uid === root.uid) return;
    if (await editing.rename(targetOf(node))) lastEditAt = Date.now();
  }

  async function deleteNode(node: TreeNode | undefined): Promise<void> {
    if (locked || !node || node.uid === root.uid) return;
    if (await editing.remove(targetOf(node))) lastEditAt = Date.now();
  }

  /** New items go in the selected folder, beside the selected file, or in the vault root. */
  async function createIn(node: TreeNode | undefined, kind: "file" | "folder"): Promise<void> {
    if (locked) return;
    const folder = !node ? root : node.kind === "folder" ? node : (node.parent ?? root);
    const path = kind === "file" ? await editing.createNote(folder.path) : await editing.createFolder(folder.path);
    if (!path) return;
    lastEditAt = Date.now();
    pendingSelect = path;
    // Open the folder with its files showing; the new card's own batch is revealed once it exists.
    viewState = showFolderContents(viewState, folder.uid);
    // The vault's own event usually arrives first; if it already has, the card is there now.
    selectPending(index);
  }

  function dropRefusal(sourceId: string, targetId: string): string | null {
    const source = index.get(sourceId);
    const destination = index.get(targetId);
    if (!source || source.uid === root.uid) return "That cannot be moved.";
    if (!destination || destination.kind !== "folder") return "Drop it onto a folder to move it.";
    return editing.moveRefusal(targetOf(source), destination.path);
  }

  async function dropOn(sourceId: string, targetId: string): Promise<void> {
    const source = index.get(sourceId);
    const destination = index.get(targetId);
    if (locked || !source || !destination) return;
    if (await editing.move(targetOf(source), destination.path)) {
      lastEditAt = Date.now();
      pendingReveal = joinPath(destination.path, source.name);
      viewState = showFolderContents(viewState, destination.uid);
      // The vault's own event usually arrives first; if it already has, the card is there now.
      revealPending(index);
    }
  }

  /** Right-click selects the card. Locked, the menu only says so; unlocked, it offers the edits. */
  function openMenu(id: string, event: MouseEvent): void {
    const node = index.get(id);
    if (!node) return;
    viewState = select(viewState, id);
    if (locked) {
      editing.menu(event, [{ label: "Locked: unlock to edit", icon: "lock", disabled: true }]);
      return;
    }
    const isRoot = node.uid === root.uid;
    editing.menu(event, [
      { label: "Rename", icon: "pencil", disabled: isRoot, run: () => void renameNode(node) },
      { label: "New note here", icon: "file-plus", run: () => void createIn(node, "file") },
      { label: "New folder here", icon: "folder-plus", run: () => void createIn(node, "folder") },
      { label: "Delete", icon: "trash", disabled: isRoot, run: () => void deleteNode(node) },
    ]);
  }

  function refit(): void {
    fitKey += 1;
  }

  /** The Mind map button: pick the layout, and on later clicks switch its balanced and one-sided views. */
  function chooseMindMap(): void {
    if (viewState.layoutMode !== "mindmap") {
      viewState = setLayout(viewState, "mindmap");
      refit();
      return;
    }
    const field = findField("layout.mindMapView");
    if (!field) return;
    const next = cfg.layout.mindMapView === "balanced" ? "oneSided" : "balanced";
    // The setting is the one source of truth, so the choice is remembered between sessions.
    // Changing it changes the layout options, which re-lays out and re-frames the view.
    settings.update((current) => withFieldValue(current, field, next));
  }

  /** The Compact button: an on and off switch for the saved `layout.density`, so it is remembered. */
  function toggleCompact(): void {
    const field = findField("layout.density");
    if (!field) return;
    const next = cfg.layout.density === "compact" ? "comfortable" : "compact";
    // Changing it changes the layout options, which re-lays out and re-frames the view.
    settings.update((current) => withFieldValue(current, field, next));
  }

  // The folders on screen that are closed and have something to show: what Expand folders opens next.
  const expandFrontier = $derived(
    visible
      .filter(
        (item) =>
          item.kind === "folder" &&
          item.node !== null &&
          !viewState.open.has(item.id) &&
          item.node.children.some((child) => child.kind === "folder" || filesVisible(shown, item.id)),
      )
      .map((item) => item.id),
  );

  /** Expand folders: one level deeper each press; when every folder on screen is open, close them all. */
  function expandFolders(): void {
    viewState = expandFrontier.length > 0 ? expandLevel(viewState, expandFrontier) : collapseFolders(viewState, root.uid);
  }

  /** The "+N more" card: reveals the next batch of the folder's children. */
  function revealMore(folderUid: string): void {
    const folder = index.get(folderUid);
    if (!folder) return;
    const batch = nextBatchFor(folder, shown, cfg.layout.overflowLimit);
    if (batch !== null) viewState = revealBatch(viewState, folderUid, batch);
  }

  function activate(id: string): void {
    const item = visible.find((candidate) => candidate.id === id);
    if (!item) return;
    if (item.kind === "more") {
      // The pill expands its parent's overflow; it is never selected. Once the folder is as
      // expanded as it can be, the pill only reports what is left out.
      if (item.parentId && !item.capped) revealMore(item.parentId);
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
      openFile(node.path, openTarget(modifiers, cfg.layout.openNotesIn));
    }
  }

  /** The keyboard: arrows move through the cards, Right and Left open and close, Enter opens. */
  function navigateKey(event: KeyboardEvent): boolean {
    // F shows or hides the files of the selected folder, as its count badge does for the mouse.
    if (event.key === "f" || event.key === "F") {
      if (selectedNode?.kind === "folder") viewState = toggleFilesFor(viewState, selectedNode.uid);
      return true;
    }
    if (!NAV_KEYS.includes(event.key)) return false;
    const list: NavItem[] = visible.map((item) => ({
      id: item.id,
      kind: item.kind,
      parentId: item.parentId,
      isOpen: viewState.open.has(item.id),
    }));
    const action = navigate(event.key, list, viewState.selected);
    if (!action) return true;
    if (action.type === "select") {
      viewState = select(viewState, action.id);
    } else if (action.type === "open" || action.type === "close") {
      viewState = toggleOpen(viewState, action.id);
    } else if (action.type === "activate") {
      const item = visible.find((candidate) => candidate.id === action.id);
      if (!item) return true;
      if (item.kind === "more") {
        if (item.parentId && !item.capped) revealMore(item.parentId);
      } else {
        openCard(action.id, { ctrlKey: event.ctrlKey, metaKey: event.metaKey });
      }
    }
    return true;
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

<div class="island-app" bind:this={appEl}>
  <Toolbar
    layoutMode={viewState.layoutMode}
    mindMapView={cfg.layout.mindMapView}
    compact={cfg.layout.density === "compact"}
    ondensity={toggleCompact}
    foldersOn={viewState.foldersOn}
    filesOn={shown.filesOn}
    canExpandFiles={viewState.focusRoot !== root.uid}
    detailOn={viewState.detail}
    query={typed}
    {suggestions}
    searchFiles={cfg.layout.searchFiles}
    onsearchfiles={toggleSearchFiles}
    onpick={(uid) => void pickCard(uid)}
    canFocus={selectedNode?.kind === "folder"}
    isFocused={viewState.focusRoot !== root.uid}
    onlayout={(mode) => {
      viewState = setLayout(viewState, mode);
      refit();
    }}
    onmindmap={chooseMindMap}
    canExpandMore={expandFrontier.length > 0}
    onfolders={expandFolders}
    onfiles={() => {
      if (filesCanExpand(viewState, root.uid)) viewState = setFilesOn(viewState, !viewState.filesOn);
    }}
    ondetail={() => {
      viewState = setDetail(viewState, !viewState.detail);
      refit();
    }}
    onreset={() => {
      viewState = restartView(viewState, initialViewState(root.uid, firstLevel(root), startOptions()));
      refit();
    }}
    onquery={typeQuery}
    onsearchenter={nothingToGoTo}
    onsearchescape={focusCanvas}
    onsearchfocus={() => driveAuto({ type: "pause" })}
    onfocus={focusSelected}
    onunfocus={() => {
      viewState = resetFocus(viewState, root.uid);
      refit();
    }}
    {locked}
    onlock={toggleLock}
  />
  <Breadcrumb {crumbs} onselect={focusCrumb} />
  {#if !locked}
    <EditBar
      target={selectedNode?.name ?? null}
      canRename={canEditSelected}
      canDelete={canEditSelected}
      onrename={() => void renameNode(selectedNode)}
      onnote={() => void createIn(selectedNode, "file")}
      onfolder={() => void createIn(selectedNode, "folder")}
      ondelete={() => void deleteNode(selectedNode)}
    />
  {/if}
  <div class="island-stage">
  <Canvas
    {items}
    targets={placed.positions}
    cardWidth={placed.cardSize.width}
    cardHeight={placed.cardSize.height}
    radialCentre={placed.centre}
    sides={placed.sides ?? null}
    curve={cfg.lines.curve}
    grid={{ type: cfg.canvas.grid, size: cfg.canvas.gridSize, spacing: cfg.canvas.gridSpacing }}
    {fitKey}
    wheel={cfg.canvas.wheel}
    {auto}
    autoSpeed={cfg.canvas.autoScrollSpeed}
    autoAtEnd={cfg.canvas.autoScrollAtEnd}
    onauto={driveAuto}
    savedCamera={cameras[viewState.layoutMode] ?? null}
    onsavecamera={(camera) => (cameras = withCamera(cameras, viewState.layoutMode, camera))}
    onmenu={(event, entries) => editing.menu(event, entries)}
    onnotice={(message) => editing.notify(message)}
    activeId={viewState.selected}
    onkey={navigateKey}
    onfit={refit}
    frameBox={placed.frame ?? null}
    onnodeclick={activate}
    onbadge={(id) => (viewState = toggleFilesFor(viewState, id))}
    onopen={openCard}
    ondrop={(sourceId, targetId) => void dropOn(sourceId, targetId)}
    droprefusal={dropRefusal}
    onrefuse={(message) => editing.notify(message)}
    oncontext={openMenu}
  />
  <InfoPanel
    info={describeSelection(selectedNode ?? null, metaFor(selectedNode), {
      tags: cfg.cards.showTags,
    })}
  />
  </div>
</div>
