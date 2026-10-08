/**
 * Opens a vault file in a new tab or a split.
 *
 * Goes through the workspace so Obsidian handles history, linked panes and
 * its own settings. A file that has vanished since the dashboard was built (the
 * tree does not follow changes until milestone 4) gets a short notice instead
 * of an error.
 */
import { Notice, type App } from "obsidian";
import type { OpenTarget } from "./target";

export async function openFile(app: App, path: string, target: OpenTarget): Promise<void> {
  const file = app.vault.getFileByPath(path);
  if (!file) {
    new Notice("That file is no longer in the vault.");
    return;
  }
  const leaf = app.workspace.getLeaf(target === "split" ? "split" : "tab");
  await leaf.openFile(file);
}
