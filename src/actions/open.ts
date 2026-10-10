/**
 * Opens a vault file in a new tab, a split, or the dashboard's own tab.
 *
 * Goes through the workspace so Obsidian handles history, linked panes and
 * its own settings. Opening in the dashboard's own tab is what lets Obsidian's
 * Back return to it (the view saves its state for that, see `view.ts`). A file
 * that has vanished since the dashboard was built gets a short notice instead
 * of an error.
 */
import { Notice, type App, type WorkspaceLeaf } from "obsidian";
import { resolveTarget, type OpenTarget } from "./target";

export async function openFile(app: App, path: string, target: OpenTarget, own: WorkspaceLeaf): Promise<void> {
  const file = app.vault.getFileByPath(path);
  if (!file) {
    new Notice("That file is no longer in the vault.");
    return;
  }
  const root = own.getRoot();
  const inSidebar = root === app.workspace.leftSplit || root === app.workspace.rightSplit;
  // A pinned tab is meant to stay put, so a note never replaces it.
  const pinned = own.getViewState().pinned === true;
  const where = resolveTarget(target, inSidebar || pinned);
  const leaf = where === "this" ? own : app.workspace.getLeaf(where === "split" ? "split" : "tab");
  await leaf.openFile(file);
}
