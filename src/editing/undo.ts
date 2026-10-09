/**
 * What an undo needs to remember, and the list of undos still on offer.
 *
 * Undo is best effort (SPEC.md section 8): each entry says how to reverse one action, and
 * the controller checks the vault is still as the action left it before doing so. This
 * module is the pure part: the entries, and a short list that makes sure an entry can only
 * be used once and that the list cannot grow without limit.
 */

/** One step that reverses an action. */
export type UndoOperation =
  /** Put an item back where it was: rename `to` back to `from` (used for renames and moves). */
  | { type: "rename"; from: string; to: string }
  /** Remove something the action created. */
  | { type: "trash"; path: string; kind: "file" | "folder" }
  /** Bring back a deleted file with its saved content. */
  | { type: "recreate"; path: string; content: ArrayBuffer };

export interface UndoEntry {
  /** What happened, shown in the toast. */
  message: string;
  undo: UndoOperation;
}

/** Entries older than this many actions are forgotten. */
export const MAX_UNDO_ENTRIES = 20;

/** The entries that can still be undone. */
export class UndoStack {
  private entries: UndoEntry[] = [];

  /** Adds an entry, forgetting the oldest if there are too many. */
  push(entry: UndoEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_UNDO_ENTRIES) this.entries.shift();
  }

  /**
   * Claims an entry for undoing. Returns false if it was already used or has been forgotten,
   * so clicking Undo twice cannot reverse an action twice.
   */
  take(entry: UndoEntry): boolean {
    const position = this.entries.indexOf(entry);
    if (position < 0) return false;
    this.entries.splice(position, 1);
    return true;
  }

  get size(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }
}
