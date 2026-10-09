/**
 * The Obsidian view that hosts the dashboard.
 *
 * It is a thin shell: it owns the leaf lifecycle and mounts the Svelte app into
 * the view's content element, so all dashboard logic stays out of Obsidian
 * specific code.
 */
import { ItemView, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { openFile } from "./actions/open";
import type { OpenTarget } from "./actions/target";
import type IslandTreePlugin from "./main";
import { MetaReader } from "./model/metaSource";
import { readVault } from "./model/vault";
import { settingsToCssVars } from "./settings/cssVars";
import { watchVault, type VaultWatchHandlers } from "./model/watch";
import App from "./ui/App.svelte";

export const VIEW_TYPE_ISLAND_TREE = "island-tree-view";

export class IslandTreeView extends ItemView {
  private component: ReturnType<typeof mount> | null = null;
  private stopStyling: (() => void) | null = null;

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

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("island-tree-view");
    // Every visual setting is a CSS variable on the view, so a change restyles it at once.
    this.stopStyling = this.plugin.store.subscribe((settings) => {
      this.contentEl.setCssProps(settingsToCssVars(settings));
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
        openFile: (path: string, target: OpenTarget) => void openFile(this.app, path, target),
        settings: this.plugin.store,
      },
    });
  }

  // Destroying the component here stops its listeners and animation frames
  // when the leaf closes, which community plugin review checks for.
  async onClose(): Promise<void> {
    this.stopStyling?.();
    this.stopStyling = null;
    if (this.component) {
      void unmount(this.component);
      this.component = null;
    }
  }
}
