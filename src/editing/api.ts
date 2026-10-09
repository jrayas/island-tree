/**
 * What the dashboard's UI may ask of the editing code, with no Obsidian types in sight.
 *
 * The Svelte app depends on this interface only, so it can be driven in tests and a
 * browser harness with a stand-in. `EditingController` (controller.ts) is the real one.
 */

/** The file or folder an edit acts on. */
export interface EditTarget {
  /** Vault path; the vault root is "/". */
  path: string;
  /** The full name, including a file's extension. */
  name: string;
  kind: "file" | "folder";
}

/** One line of the right-click menu. */
export interface MenuEntry {
  label: string;
  /** An Obsidian icon name. */
  icon?: string;
  disabled?: boolean;
  run?: () => void;
}

export interface EditingApi {
  /** Asks for a new name and renames. True if something changed. */
  rename(target: EditTarget): Promise<boolean>;
  /** Asks for a name and creates a note in the folder. Returns the new path, or null if nothing was created. */
  createNote(folderPath: string): Promise<string | null>;
  /** Asks for a name and creates a folder in the folder. Returns the new path, or null if nothing was created. */
  createFolder(folderPath: string): Promise<string | null>;
  /** Moves to the trash after any confirmation the settings and the size call for. True if it happened. */
  remove(target: EditTarget): Promise<boolean>;
  /** Moves into a folder after any confirmation. True if it happened. */
  move(target: EditTarget, folderPath: string): Promise<boolean>;
  /** Why a move would be refused, or null when allowed. Cheap enough to call while dragging. */
  moveRefusal(target: EditTarget, folderPath: string): string | null;
  /** Shows a short message. */
  notify(message: string): void;
  /** Shows a context menu at the pointer. */
  menu(event: MouseEvent, entries: MenuEntry[]): void;
}

/** The lock can be toggled from outside the app (the "Toggle lock" command). */
export interface LockBridge {
  toggle: (() => void) | null;
}
