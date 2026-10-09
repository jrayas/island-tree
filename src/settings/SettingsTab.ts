/**
 * The plugin's settings page: a header, a live preview, a horizontal tab strip
 * and the settings for the chosen tab.
 *
 * The tab strip follows the usual tabs pattern: each tab is a button inside a
 * tablist, only the chosen one is in the tab order, and the arrow keys move
 * between them. On a narrow pane the strip scrolls sideways.
 */
import { type App, PluginSettingTab, setIcon } from "obsidian";
import type IslandTreePlugin from "../main";
import { renderPreview } from "./Preview";
import { TABS, type TabId } from "./schema";
import { renderFieldTab, renderPresetsTab } from "./tabs";

export class IslandTreeSettingTab extends PluginSettingTab {
  private active: TabId = "cards";
  private stopPreview: (() => void) | null = null;

  constructor(
    app: App,
    private readonly plugin: IslandTreePlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("island-settings");

    const header = containerEl.createDiv({ cls: "island-settings-header" });
    setIcon(header.createSpan({ cls: "island-settings-icon" }), "network");
    const text = header.createDiv();
    text.createDiv({ cls: "island-settings-title", text: "Island tree" });
    text.createDiv({
      cls: "island-settings-subtitle",
      text: "Shape how your vault looks as a dashboard. Changes apply straight away.",
    });

    this.stopPreview?.();
    this.stopPreview = renderPreview(containerEl, this.plugin.store);

    const strip = containerEl.createDiv({ cls: "island-tabs" });
    strip.setAttribute("role", "tablist");
    strip.setAttribute("aria-label", "Settings sections");
    const panel = containerEl.createDiv({ cls: "island-tabpanel" });
    panel.setAttribute("role", "tabpanel");

    const buttons = new Map<TabId, HTMLButtonElement>();

    const fill = (): void => {
      panel.empty();
      const rerender = (): void => fill();
      if (this.active === "presets") {
        renderPresetsTab(panel, this.app, this.plugin.store, rerender);
      } else {
        renderFieldTab(panel, this.plugin.store, this.active, rerender);
      }
    };

    const choose = (id: TabId, focus: boolean): void => {
      this.active = id;
      for (const [tabId, button] of buttons) {
        const selected = tabId === id;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
        button.toggleClass("is-active", selected);
      }
      panel.setAttribute("aria-labelledby", `island-tab-${id}`);
      if (focus) buttons.get(id)?.focus();
      fill();
    };

    TABS.forEach((tab, position) => {
      const button = strip.createEl("button", { cls: "island-tab", text: tab.label });
      button.id = `island-tab-${tab.id}`;
      button.setAttribute("role", "tab");
      button.type = "button";
      button.addEventListener("click", () => choose(tab.id, false));
      button.addEventListener("keydown", (event) => {
        const last = TABS.length - 1;
        let target: number | null = null;
        if (event.key === "ArrowRight") target = position === last ? 0 : position + 1;
        else if (event.key === "ArrowLeft") target = position === 0 ? last : position - 1;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = last;
        const next = target === null ? undefined : TABS[target];
        if (next) {
          event.preventDefault();
          choose(next.id, true);
        }
      });
      buttons.set(tab.id, button);
    });

    choose(this.active, false);
  }

  // Stop redrawing the preview once the page is closed.
  hide(): void {
    this.stopPreview?.();
    this.stopPreview = null;
  }
}
