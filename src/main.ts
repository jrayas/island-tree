/**
 * Plugin entry point.
 *
 * Registers the view, ribbon icon, commands and settings tab, and loads and
 * saves settings. Everything registered here is cleaned up by Obsidian on unload.
 */
import { Notice, Plugin, type WorkspaceLeaf } from "obsidian";
import { IslandTreeSettingTab } from "./settings/SettingsTab";
import { loadSettingsFrom } from "./settings/validate";
import { SettingsStore } from "./settings/store";
import { IslandTreeView, VIEW_TYPE_ISLAND_TREE } from "./view";

export default class IslandTreePlugin extends Plugin {
  /** The live settings, shared by the settings page and every open dashboard. */
  store!: SettingsStore;

  async onload(): Promise<void> {
    this.store = new SettingsStore(
      loadSettingsFrom(await this.loadData()),
      (settings) => this.saveData(settings),
      300,
      () => new Notice("Island tree could not save its settings."),
    );

    this.registerView(VIEW_TYPE_ISLAND_TREE, (leaf) => new IslandTreeView(leaf, this));

    this.addRibbonIcon("network", "Open dashboard", () => {
      void this.activateView("tab");
    });

    // No default hotkeys, as the community plugin guidelines require.
    this.addCommand({
      id: "open",
      name: "Open dashboard",
      callback: () => void this.activateView("tab"),
    });
    this.addCommand({
      id: "open-in-sidebar",
      name: "Open dashboard in sidebar",
      callback: () => void this.activateView("sidebar"),
    });

    // Only offered while the dashboard is the active view, since the lock belongs to it.
    this.addCommand({
      id: "toggle-lock",
      name: "Toggle lock",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(IslandTreeView);
        if (!view) return false;
        if (!checking) view.toggleLock();
        return true;
      },
    });

    this.addCommand({
      id: "toggle-auto-scroll",
      name: "Toggle auto-scroll",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(IslandTreeView);
        if (!view) return false;
        if (!checking) view.toggleAutoScroll();
        return true;
      },
    });

    this.addSettingTab(new IslandTreeSettingTab(this.app, this));
  }

  /**
   * Shows the dashboard, reusing an existing leaf so repeated clicks never
   * create duplicates.
   */
  async activateView(where: "tab" | "sidebar"): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_ISLAND_TREE)[0] ?? null;
    if (!leaf) {
      leaf = where === "sidebar" ? workspace.getRightLeaf(false) : workspace.getLeaf("tab");
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE_ISLAND_TREE, active: true });
    }
    await workspace.revealLeaf(leaf);
  }

  // A change made just before closing Obsidian is still waiting for its delayed save.
  onunload(): void {
    void this.store.flush();
  }
}
