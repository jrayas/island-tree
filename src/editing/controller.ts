/**
 * Edits the vault for the dashboard, through Obsidian's own file APIs.
 *
 * Rename and move go through `fileManager.renameFile` so links in other notes follow,
 * deleting goes through `fileManager.trashFile` so the person's trash setting is
 * respected, and creating goes through `vault.create` and `vault.createFolder`
 * (SPEC.md section 8). Every method checks first, reports problems as a notice, and never
 * throws. Each successful edit shows a notice with an Undo button that lasts about seven
 * seconds. Undo is best effort: if the vault has changed since, it says so and leaves
 * things alone. The decisions are in `rules.ts` and `undo.ts`, which are tested without
 * Obsidian; this file is the thin layer that calls the vault.
 */
import { Menu, Notice, TFile, TFolder, normalizePath, type App, type TAbstractFile } from "obsidian";
import { confirmAction, promptForText } from "../settings/modals";
import type { EditingSettings } from "../settings/schema";
import type { EditTarget, EditingApi, MenuEntry } from "./api";
import {
  ROOT_PATH,
  checkMove,
  countFiles,
  joinPath,
  needsConfirmation,
  renamedPath,
  splitExtension,
  uniqueName,
  validateName,
} from "./rules";
import { showUndoNotice } from "./toast";
import { UndoStack, type UndoEntry } from "./undo";

/** A deleted file is only restorable if it is no bigger than this, because its content is kept in memory. */
const MAX_RESTORABLE_BYTES = 20 * 1024 * 1024;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class EditingController implements EditingApi {
  private readonly undoStack = new UndoStack();

  constructor(
    private readonly app: App,
    private readonly settings: () => EditingSettings,
  ) {}

  notify(message: string): void {
    new Notice(message);
  }

  menu(event: MouseEvent, entries: MenuEntry[]): void {
    const menu = new Menu();
    for (const entry of entries) {
      menu.addItem((item) => {
        item.setTitle(entry.label).setDisabled(entry.disabled === true);
        if (entry.icon) item.setIcon(entry.icon);
        const run = entry.run;
        if (run) item.onClick(() => run());
      });
    }
    menu.showAtMouseEvent(event);
  }

  moveRefusal(target: EditTarget, folderPath: string): string | null {
    const folder = this.folderAt(folderPath);
    if (!folder) return "That folder no longer exists.";
    const result = checkMove(target, folderPath, folder.children.map((child) => child.name));
    return result.ok ? null : result.reason;
  }

  async rename(target: EditTarget): Promise<boolean> {
    try {
      const file = this.fileAt(target.path);
      if (!file) return this.missing();
      const extension = target.kind === "file" ? splitExtension(target.name).extension : "";
      const siblings = this.namesIn(this.parentFolder(file));
      const answer = await promptForText(this.app, {
        title: target.kind === "file" ? "Rename note" : "Rename folder",
        label: "Name",
        initial: target.name.slice(0, target.name.length - extension.length),
        confirmLabel: "Rename",
        validate: (text) => validateName(text.trim() + extension, siblings, target.name),
      });
      if (answer === null) return false;
      const newPath = renamedPath(target.path, answer.trim(), target.kind);
      if (newPath === target.path) return false;
      await this.app.fileManager.renameFile(file, normalizePath(newPath));
      this.announce({
        message: `Renamed to "${newPath.slice(newPath.lastIndexOf("/") + 1)}".`,
        undo: { type: "rename", from: target.path, to: newPath },
      });
      return true;
    } catch (error) {
      new Notice(`Could not rename: ${messageOf(error)}`);
      return false;
    }
  }

  async move(target: EditTarget, folderPath: string): Promise<boolean> {
    try {
      const refusal = this.moveRefusal(target, folderPath);
      if (refusal) {
        new Notice(refusal);
        return false;
      }
      const file = this.fileAt(target.path);
      if (!file) return this.missing();
      const files = this.fileCountOf(file);
      const where = folderPath === ROOT_PATH ? "the vault root" : `"${folderPath}"`;
      if (file instanceof TFolder && needsConfirmation(files, this.settings().confirmThreshold)) {
        const ok = await confirmAction(this.app, {
          title: "Move folder",
          message: `"${target.name}" holds ${files} files. Move it into ${where}?`,
          confirmLabel: "Move",
        });
        if (!ok) return false;
      }
      const newPath = joinPath(folderPath, target.name);
      await this.app.fileManager.renameFile(file, normalizePath(newPath));
      this.announce({
        message: `Moved "${target.name}" into ${where}.`,
        undo: { type: "rename", from: target.path, to: newPath },
      });
      return true;
    } catch (error) {
      new Notice(`Could not move: ${messageOf(error)}`);
      return false;
    }
  }

  createNote(folderPath: string): Promise<string | null> {
    return this.create(folderPath, "file");
  }

  createFolder(folderPath: string): Promise<string | null> {
    return this.create(folderPath, "folder");
  }

  async remove(target: EditTarget): Promise<boolean> {
    try {
      const file = this.fileAt(target.path);
      if (!file) return this.missing();
      if (target.path === ROOT_PATH) {
        new Notice("The vault itself cannot be deleted.");
        return false;
      }
      const files = this.fileCountOf(file);
      const bigFolder = file instanceof TFolder && needsConfirmation(files, this.settings().confirmThreshold);
      if (bigFolder || this.settings().deleteBehaviour === "ask") {
        const what = file instanceof TFolder ? `the folder "${target.name}" and the ${files} files in it` : `"${target.name}"`;
        const ok = await confirmAction(this.app, {
          title: file instanceof TFolder ? "Delete folder" : "Delete note",
          message: `Move ${what} to the trash?`,
          confirmLabel: "Delete",
          warning: true,
        });
        if (!ok) return false;
      }
      // A single file can be brought back by saving its content first. A folder cannot be
      // restored reliably, because the trash may be the system's, so it says where to look.
      let content: ArrayBuffer | null = null;
      if (file instanceof TFile && file.stat.size <= MAX_RESTORABLE_BYTES) {
        content = await this.app.vault.readBinary(file);
      }
      await this.app.fileManager.trashFile(file);
      if (content) {
        this.announce({ message: `Moved "${target.name}" to the trash.`, undo: { type: "recreate", path: target.path, content } });
      } else {
        new Notice(`Moved "${target.name}" to the trash. It can be restored from there.`, 7000);
      }
      return true;
    } catch (error) {
      new Notice(`Could not delete: ${messageOf(error)}`);
      return false;
    }
  }

  private async create(folderPath: string, kind: "file" | "folder"): Promise<string | null> {
    try {
      const folder = this.folderAt(folderPath);
      if (!folder) {
        this.missing();
        return null;
      }
      const extension = kind === "file" ? ".md" : "";
      const siblings = this.namesIn(folder);
      const answer = await promptForText(this.app, {
        title: kind === "file" ? "New note" : "New folder",
        label: "Name",
        initial: uniqueName(kind === "file" ? "Untitled" : "New folder", extension, siblings),
        confirmLabel: "Create",
        validate: (text) => validateName(text.trim() + extension, siblings),
      });
      if (answer === null) return null;
      const path = normalizePath(joinPath(folderPath, answer.trim() + extension));
      if (kind === "file") await this.app.vault.create(path, "");
      else await this.app.vault.createFolder(path);
      this.announce({
        message: `Created "${path.slice(path.lastIndexOf("/") + 1)}".`,
        undo: { type: "trash", path, kind },
      });
      return path;
    } catch (error) {
      new Notice(`Could not create it: ${messageOf(error)}`);
      return null;
    }
  }

  /** Records an undo and tells the person what happened, with an Undo button for about seven seconds. */
  private announce(entry: UndoEntry): void {
    this.undoStack.push(entry);
    showUndoNotice(entry.message, () => void this.undo(entry));
  }

  /** Reverses one action, or says why it could not (the vault has changed since). */
  private async undo(entry: UndoEntry): Promise<void> {
    if (!this.undoStack.take(entry)) {
      new Notice("That change can no longer be undone.");
      return;
    }
    try {
      const step = entry.undo;
      if (step.type === "rename") {
        const file = this.fileAt(step.to);
        if (!file) return void new Notice("Cannot undo: it is no longer where it was left.");
        if (this.fileAt(step.from)) return void new Notice("Cannot undo: something else now has the original name.");
        await this.app.fileManager.renameFile(file, normalizePath(step.from));
        new Notice("Undone.");
      } else if (step.type === "trash") {
        const file = this.fileAt(step.path);
        if (!file) return void new Notice("Cannot undo: it has already gone.");
        const untouched =
          file instanceof TFolder ? file.children.length === 0 : file instanceof TFile && file.stat.size === 0;
        if (!untouched) return void new Notice("Cannot undo: it has been changed since, so it was left alone.");
        await this.app.fileManager.trashFile(file);
        new Notice("Undone.");
      } else {
        if (this.fileAt(step.path)) return void new Notice("Cannot undo: something else now has that name.");
        const parent = step.path.includes("/") ? step.path.slice(0, step.path.lastIndexOf("/")) : ROOT_PATH;
        if (parent !== ROOT_PATH && !this.folderAt(parent)) await this.app.vault.createFolder(normalizePath(parent));
        await this.app.vault.createBinary(normalizePath(step.path), step.content);
        new Notice("Restored.");
      }
    } catch (error) {
      new Notice(`Could not undo: ${messageOf(error)}`);
    }
  }

  private missing(): boolean {
    new Notice("That file or folder is no longer there.");
    return false;
  }

  private fileAt(path: string): TAbstractFile | null {
    return path === ROOT_PATH ? this.app.vault.getRoot() : this.app.vault.getAbstractFileByPath(path);
  }

  private folderAt(path: string): TFolder | null {
    return path === ROOT_PATH ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(path);
  }

  private parentFolder(file: TAbstractFile): TFolder | null {
    return file.parent ?? this.app.vault.getRoot();
  }

  private namesIn(folder: TFolder | null): string[] {
    return folder ? folder.children.map((child) => child.name) : [];
  }

  private fileCountOf(file: TAbstractFile): number {
    if (!(file instanceof TFolder)) return 1;
    return countFiles(toCountable(file));
  }
}

interface Countable {
  kind: "file" | "folder";
  children: Countable[];
}

/** Adapts Obsidian's folder tree to the shape `countFiles` takes. */
function toCountable(file: TAbstractFile): Countable {
  if (file instanceof TFolder) return { kind: "folder", children: file.children.map(toCountable) };
  return { kind: "file", children: [] };
}
