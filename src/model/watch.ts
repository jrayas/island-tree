/**
 * Listens for changes to the vault and tells the dashboard.
 *
 * Editing a note fires `modify` and `changed` many times a second, so every
 * notification is held back until things go quiet for a moment and then sent
 * once. A burst of structure changes (a sync, a pasted folder) is gathered into
 * one update that lists every path involved, so counts can be updated only where
 * something changed. Renames are reported straight away, before that wait, so the
 * dashboard can keep a moved file's identity.
 */
import { debounce, type App, type EventRef } from "obsidian";
import { CHANGE_DELAY_MS } from "./limits";

export interface VaultWatchHandlers {
  /**
   * Files were created, deleted or moved: the tree needs rebuilding. `changed` is every path
   * involved since the last update (both the old and the new path of a move).
   */
  onStructure: (changed: readonly string[]) => void;
  /** File contents, links, tags or properties changed: details need re-reading. */
  onMetadata: () => void;
  /** A file or folder was renamed or moved. Called at once, not held back. */
  onRename: (oldPath: string, newPath: string) => void;
}

/**
 * Starts listening and returns a function that stops. Each listener is also handed to `register`
 * (the view's `registerEvent`), so Obsidian removes it if the view goes away without stopping.
 */
export function watchVault(
  app: App,
  handlers: VaultWatchHandlers,
  register: (ref: EventRef) => void = () => {},
  delayMs: number = CHANGE_DELAY_MS,
): () => void {
  const { vault, metadataCache } = app;
  const pending = new Set<string>();
  const send = (): void => {
    const changed = [...pending];
    pending.clear();
    handlers.onStructure(changed);
  };
  // `true` restarts the wait on every call, so a burst of events sends one update.
  const structure = debounce(send, delayMs, true);
  const metadata = debounce(handlers.onMetadata, delayMs, true);
  const note = (...paths: string[]): void => {
    for (const path of paths) pending.add(path);
    structure();
  };

  const vaultRefs: EventRef[] = [
    vault.on("create", (file) => note(file.path)),
    vault.on("delete", (file) => note(file.path)),
    vault.on("rename", (file, oldPath) => {
      handlers.onRename(oldPath, file.path);
      note(oldPath, file.path);
    }),
    vault.on("modify", () => metadata()),
  ];
  const cacheRefs: EventRef[] = [
    metadataCache.on("changed", () => metadata()),
    metadataCache.on("resolved", () => metadata()),
  ];
  [...vaultRefs, ...cacheRefs].forEach(register);

  return () => {
    vaultRefs.forEach((ref) => vault.offref(ref));
    cacheRefs.forEach((ref) => metadataCache.offref(ref));
    structure.cancel();
    metadata.cancel();
    pending.clear();
  };
}
