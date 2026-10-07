/**
 * Plugin entry point.
 *
 * Registers the view, ribbon icon, commands and settings tab, and loads and
 * saves settings. Everything registered here is cleaned up by Obsidian on unload.
 */
import { Plugin, type WorkspaceLeaf } from "obsidian";
import { IslandTreeSettingTab } from "./settings/SettingsTab";
import { DEFAULT_SETTINGS, type IslandTreeSettings } from "./settings/defaults";
import { IslandTreeView, VIEW_TYPE_ISLAND_TREE } from "./view";

export default class IslandTreePlugin extends Plugin {
  settings: IslandTreeSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_ISLAND_TREE, (leaf) => new IslandTreeView(leaf));

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

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<IslandTreeSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...saved };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
