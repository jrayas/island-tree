/**
 * The contents of each settings tab.
 *
 * The Cards, Lines and grid and Layout tabs are generated from the schema; the
 * Presets tab is hand-built because it is made of actions, not settings.
 */
import { Notice, Setting, type App } from "obsidian";
import { renderField } from "./controls";
import { confirmAction, confirmImport, promptForText } from "./modals";
import { exportSettings, parseImport } from "./importExport";
import {
  BUILT_IN_PRESETS,
  applyPreset,
  checkPresetName,
  deletePreset,
  renamePreset,
  resetEverything,
  resetTab,
  saveCurrentAsPreset,
} from "./presets";
import { FIELDS, TABS, type TabId } from "./schema";
import type { SettingsStore } from "./store";

/** The tabs whose settings can be reset on their own. */
const RESETTABLE: readonly TabId[] = ["cards", "lines", "layout"];

/** Fills a tab made of settings, with a heading for each section. */
export function renderFieldTab(
  containerEl: HTMLElement,
  store: SettingsStore,
  tab: TabId,
  rerender: () => void,
): void {
  let section = "";
  for (const field of FIELDS.filter((f) => f.tab === tab)) {
    if (field.section !== section) {
      section = field.section;
      new Setting(containerEl).setName(section).setHeading();
    }
    renderField(containerEl, store, field, rerender);
  }
}

function tabLabel(id: TabId): string {
  return TABS.find((tab) => tab.id === id)?.label ?? id;
}

async function copyText(text: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    new Notice(done);
  } catch {
    new Notice("Could not copy to the clipboard.");
  }
}

function downloadText(text: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = createEl("a", { attr: { href: url, download: fileName } });
  link.click();
  URL.revokeObjectURL(url);
}

/** Shows the summary of an import and applies it if the person agrees. */
async function runImport(app: App, store: SettingsStore, text: string): Promise<void> {
  const result = parseImport(text, store.get());
  if (!result.ok) {
    new Notice(result.error);
    return;
  }
  if (await confirmImport(app, result)) {
    store.set(result.settings);
    new Notice("Settings imported.");
  }
}

function pickFile(app: App, store: SettingsStore): void {
  const input = createEl("input", { type: "file", attr: { accept: ".json,application/json" } });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    void file.text().then((text) => runImport(app, store, text));
  });
  input.click();
}

/** Fills the Presets tab: built-ins, saved presets, resets, export and import. */
export function renderPresetsTab(
  containerEl: HTMLElement,
  app: App,
  store: SettingsStore,
  rerender: () => void,
): void {
  // Built-in presets
  new Setting(containerEl).setName("Built-in presets").setHeading();
  for (const preset of BUILT_IN_PRESETS) {
    new Setting(containerEl)
      .setName(preset.name)
      .setDesc(preset.description)
      .addButton((button) =>
        button.setButtonText("Apply").onClick(() => {
          store.update((settings) => applyPreset(settings, preset));
          new Notice(`Applied the ${preset.name} preset.`);
        }),
      );
  }

  // Saved presets
  new Setting(containerEl).setName("Your presets").setHeading();
  const saved = store.get().presets;
  if (saved.length === 0) {
    containerEl.createEl("p", { cls: "setting-item-description", text: "No saved presets yet." });
  }
  for (const preset of saved) {
    new Setting(containerEl)
      .setName(preset.name)
      .addButton((button) =>
        button.setButtonText("Apply").onClick(() => {
          store.update((settings) => applyPreset(settings, preset));
          new Notice(`Applied the ${preset.name} preset.`);
        }),
      )
      .addExtraButton((button) =>
        button
          .setIcon("pencil")
          .setTooltip("Rename")
          .onClick(() => {
            void (async () => {
              const others = store.get().presets.map((p) => p.name);
              const name = await promptForText(app, {
                title: "Rename preset",
                label: "Name",
                initial: preset.name,
                confirmLabel: "Rename",
                validate: (text) => {
                  const check = checkPresetName(text, others, preset.name);
                  return check.ok ? null : check.reason;
                },
              });
              if (name === null) return;
              const result = renamePreset(store.get(), preset.name, name);
              if (result.ok) {
                store.set(result.settings);
                rerender();
              } else {
                new Notice(result.reason);
              }
            })();
          }),
      )
      .addExtraButton((button) =>
        button
          .setIcon("trash")
          .setTooltip("Delete")
          .onClick(() => {
            void (async () => {
              const sure = await confirmAction(app, {
                title: "Delete preset",
                message: `Delete the preset "${preset.name}"? This cannot be undone.`,
                confirmLabel: "Delete",
                warning: true,
              });
              if (!sure) return;
              store.update((settings) => deletePreset(settings, preset.name));
              rerender();
            })();
          }),
      );
  }

  // Save the current look
  new Setting(containerEl).setName("Save the current look").setHeading();
  let newName = "";
  new Setting(containerEl)
    .setName("Preset name")
    .setDesc("Saves the card, line, grid and layout settings as they are now.")
    .addText((text) => text.setPlaceholder("My look").onChange((value) => (newName = value)))
    .addButton((button) =>
      button
        .setButtonText("Save preset")
        .setCta()
        .onClick(() => {
          const result = saveCurrentAsPreset(store.get(), newName);
          if (!result.ok) {
            new Notice(result.reason);
            return;
          }
          store.set(result.settings);
          new Notice(`Saved the preset "${result.name}".`);
          rerender();
        }),
    );

  // Resets
  new Setting(containerEl).setName("Reset").setHeading();
  let toReset: TabId = RESETTABLE[0] ?? "cards";
  new Setting(containerEl)
    .setName("Reset one tab")
    .setDesc("Return the settings on one tab to their defaults.")
    .addDropdown((dropdown) => {
      for (const id of RESETTABLE) dropdown.addOption(id, tabLabel(id));
      dropdown.setValue(toReset).onChange((value) => (toReset = value as TabId));
    })
    .addButton((button) =>
      button.setButtonText("Reset tab").onClick(() => {
        store.update((settings) => resetTab(settings, toReset));
        new Notice(`Reset the ${tabLabel(toReset)} settings.`);
        rerender();
      }),
    );
  new Setting(containerEl)
    .setName("Reset all settings")
    .setDesc("Return every setting to its default. Your saved presets are kept.")
    .addButton((button) => {
      // The warning style is a class; the helper for it needs a newer Obsidian than we support.
      button.buttonEl.addClass("mod-warning");
      button
        .setButtonText("Reset all")
        .onClick(() => {
          void (async () => {
            const sure = await confirmAction(app, {
              title: "Reset all settings",
              message: "Return every setting to its default? Your saved presets are kept.",
              confirmLabel: "Reset all",
              warning: true,
            });
            if (!sure) return;
            store.update((settings) => resetEverything(settings));
            rerender();
          })();
        });
    });

  // Export and import
  new Setting(containerEl).setName("Export and import").setHeading();
  new Setting(containerEl)
    .setName("Export settings")
    .setDesc("Copy your settings as text, or save them to a file, to back them up or share them.")
    .addButton((button) =>
      button.setButtonText("Copy").onClick(() => {
        void copyText(exportSettings(store.get()), "Settings copied to the clipboard.");
      }),
    )
    .addButton((button) =>
      button.setButtonText("Save file").onClick(() => {
        downloadText(exportSettings(store.get()), "island-tree-settings.json");
      }),
    );
  new Setting(containerEl)
    .setName("Import settings")
    .setDesc("Read settings from the clipboard or a file. You will see a summary before anything changes.")
    .addButton((button) =>
      button.setButtonText("Paste").onClick(() => {
        void (async () => {
          try {
            await runImport(app, store, await navigator.clipboard.readText());
          } catch {
            new Notice("Could not read the clipboard.");
          }
        })();
      }),
    )
    .addButton((button) => button.setButtonText("Choose file").onClick(() => pickFile(app, store)));
}
