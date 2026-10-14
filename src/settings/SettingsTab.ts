/**
 * The plugin's settings page, drawn by Obsidian's declarative settings API (1.13 and later): a header
 * with a live preview, then one page for each of Cards, Lines and grid, Layout, Editing and Presets.
 * The settings are listed in `buildDefinitions` (definitions.ts), which is also what lets Obsidian's
 * settings search find them.
 */
import {
  type App,
  PluginSettingTab,
  type Setting,
  type SettingDefinitionItem,
  SettingPage,
  setIcon,
} from "obsidian";
import type IslandTreePlugin from "../main";
import { configureField } from "./controls";
import { buildDefinitions } from "./definitions";
import { renderPreview } from "./Preview";
import type { SettingsStore } from "./store";
import { renderPresetsTab } from "./tabs";

/** The Presets page: built-in and saved looks, resets, export and import. */
class PresetsPage extends SettingPage {
  constructor(
    private readonly app: App,
    private readonly store: SettingsStore,
  ) {
    super();
    this.title = "Presets";
  }

  display(): void {
    this.containerEl.empty();
    renderPresetsTab(this.containerEl, this.app, this.store, () => this.display());
  }
}

/** Fills a row with the header card (first page only) and the live preview. */
function renderIntro(setting: Setting, store: SettingsStore, withHeader: boolean): () => void {
  const el = setting.settingEl;
  el.empty();
  el.addClass("island-settings", "island-settings-block");

  if (withHeader) {
    const header = el.createDiv({ cls: "island-settings-header" });
    setIcon(header.createSpan({ cls: "island-settings-icon" }), "network");
    const text = header.createDiv();
    text.createDiv({ cls: "island-settings-title", text: "Island tree" });
    text.createDiv({
      cls: "island-settings-subtitle",
      text: "Shape how your vault looks as a dashboard. Changes apply straight away.",
    });
  }

  // Stops redrawing the preview once the page is closed.
  return renderPreview(el, store);
}

export class IslandTreeSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: IslandTreePlugin,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const store = this.plugin.store;
    return buildDefinitions({
      renderIntro: (setting, withHeader) => renderIntro(setting, store, withHeader),
      renderField: (setting, field) => configureField(setting, store, field),
      presetsPage: () => new PresetsPage(this.app, store),
    });
  }
}
