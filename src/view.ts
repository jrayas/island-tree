/**
 * The Obsidian view that hosts the dashboard.
 *
 * It is a thin shell: it owns the leaf lifecycle and mounts the Svelte app into
 * the view's content element, so all dashboard logic stays out of Obsidian
 * specific code.
 */
import { ItemView, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import App from "./ui/App.svelte";

export const VIEW_TYPE_ISLAND_TREE = "island-tree-view";

export class IslandTreeView extends ItemView {
  private component: ReturnType<typeof mount> | null = null;

  constructor(leaf: WorkspaceLeaf) {
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
    this.component = mount(App, { target: this.contentEl });
  }

  // Destroying the component here stops its listeners and animation frames
  // when the leaf closes, which community plugin review checks for.
  async onClose(): Promise<void> {
    if (this.component) {
      void unmount(this.component);
      this.component = null;
    }
  }
}
