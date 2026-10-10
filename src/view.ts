/**
 * The Obsidian view that hosts the dashboard.
 *
 * It is a thin shell: it owns the leaf lifecycle and mounts the Svelte app into
 * the view's content element, so all dashboard logic stays out of Obsidian
 * specific code.
 */
import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { openFile } from "./actions/open";
import { EditingController } from "./editing/controller";
import type { LockBridge } from "./editing/api";
import type { OpenTarget } from "./actions/target";
import type IslandTreePlugin from "./main";
import { MetaReader } from "./model/metaSource";
import { parseSavedView, type SavedView } from "./model/savedView";
import { readVault } from "./model/vault";
import { statusBarClearance } from "./layout/statusBar";
import { settingsToCssVars } from "./settings/cssVars";
import { withDensity } from "./settings/density";
import { watchVault, type VaultWatchHandlers } from "./model/watch";
import App from "./ui/App.svelte";
import { createStateBridge, type StateBridge } from "./ui/stateBridge";

export const VIEW_TYPE_ISLAND_TREE = "island-tree-view";

export class IslandTreeView extends ItemView {
  private component: ReturnType<typeof mount> | null = null;
  private stopStyling: (() => void) | null = null;
  private stopMeasuring: (() => void) | null = null;
  /** Lets the "Toggle lock" command reach the app, which owns the lock. */
  private readonly lockBridge: LockBridge = { toggle: null };
  /** Lets the view save and restore how the dashboard was left. */
  private readonly stateBridge: StateBridge = createStateBridge();
  /** A state Obsidian handed back before the app was mounted, used when it mounts. */
  private pending: SavedView | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: IslandTreePlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_ISLAND_TREE;
  }

  getDisplayText(): string {
    return "Island tree";
  }

  getIcon(): string {
    return "network";
  }

  /**
   * What Obsidian stores for this tab: it is read when the tab navigates away (so Back can return
   * to the dashboard as it was) and when the layout is saved. Falls back to the last state handed
   * in, so a tab that has not mounted yet does not lose it.
   */
  getState(): Record<string, unknown> {
    const island = this.stateBridge.snapshot?.() ?? this.pending;
    return island ? { ...super.getState(), island } : super.getState();
  }

  /** Obsidian hands the state back on Back and on a restart. Anything unusable is ignored. */
  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const saved = parseSavedView((state as { island?: unknown } | null)?.island);
    if (saved) {
      this.pending = saved;
      this.stateBridge.restore?.(saved);
    }
    await super.setState(state, result);
  }

  /** Locks or unlocks editing, for the "Toggle lock" command. */
  toggleLock(): void {
    this.lockBridge.toggle?.();
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("island-tree-view");
    // Every visual setting is a CSS variable on the view, so a change restyles it at once.
    this.stopStyling = this.plugin.store.subscribe((settings) => {
      this.contentEl.setCssProps(settingsToCssVars(withDensity(settings)));
    });
    const reader = new MetaReader(this.app, () => this.plugin.store.get().cards.statusProperty);
    this.component = mount(App, {
      target: this.contentEl,
      props: {
        loadTree: () => readVault(this.app.vault),
        readMeta: (path: string) => reader.read(path),
        // The link index goes stale on any change, so drop it before the app re-reads details.
        watchVault: (handlers: VaultWatchHandlers) =>
          watchVault(this.app, {
            ...handlers,
            onStructure: () => {
              reader.invalidate();
              handlers.onStructure();
            },
            onMetadata: () => {
              reader.invalidate();
              handlers.onMetadata();
            },
          }),
        openFile: (path: string, target: OpenTarget) => void openFile(this.app, path, target, this.leaf),
        settings: this.plugin.store,
        editing: new EditingController(this.app, () => this.plugin.store.get().editing),
        lockBridge: this.lockBridge,
        stateBridge: this.stateBridge,
        initialView: this.pending,
      },
    });
    // Ask Obsidian to save the layout when the view changes (it debounces), so a restart restores it.
    this.stateBridge.changed = () => void this.app.workspace.requestSaveLayout();
    this.stopMeasuring = this.watchStatusBar();
  }

  /**
   * Keeps --island-clear on the view equal to how far the details text must rise to clear the
   * floating status bar (0px when it is hidden or does not reach the text). The bar is found by its class, which is
   * not part of the plugin API, so a missing bar simply means no lift. Returns a function
   * that stops measuring.
   */
  private watchStatusBar(): () => void {
    const view = this.contentEl;
    const doc = view.ownerDocument;
    const win = doc.defaultView ?? window;
    const update = (): void => {
      const bar = doc.querySelector(".status-bar");
      const text = view.querySelector(".island-info");
      const clearance = statusBarClearance(
        view.getBoundingClientRect(),
        bar?.getBoundingClientRect() ?? null,
        text?.getBoundingClientRect() ?? null,
      );
      view.setCssProps({ "--island-clear": `${clearance}px` });
    };
    const observer = new win.ResizeObserver(update);
    observer.observe(view);
    // The text's width changes with the selection, and decides whether the bar reaches it.
    const text = view.querySelector(".island-info");
    if (text) observer.observe(text);
    const bar = doc.querySelector(".status-bar");
    if (bar) observer.observe(bar);
    win.addEventListener("resize", update);
    this.registerEvent(this.app.workspace.on("layout-change", update));
    update();
    return () => {
      observer.disconnect();
      win.removeEventListener("resize", update);
    };
  }

  // Destroying the component here stops its listeners and animation frames
  // when the leaf closes, which community plugin review checks for.
  async onClose(): Promise<void> {
    this.stateBridge.changed = null;
    this.stopStyling?.();
    this.stopStyling = null;
    this.stopMeasuring?.();
    this.stopMeasuring = null;
    if (this.component) {
      void unmount(this.component);
      this.component = null;
    }
  }
}
