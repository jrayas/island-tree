/**
 * The plugin's settings page.
 *
 * Empty in milestone 1; milestone 5 adds the horizontal tab strip and controls.
 */
import { type App, PluginSettingTab } from "obsidian";
import type IslandTreePlugin from "../main";

export class IslandTreeSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: IslandTreePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("p", {
      text: "Settings arrive in a later milestone.",
    });
  }
}
