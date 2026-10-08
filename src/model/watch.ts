/**
 * Listens for changes to the vault and tells the dashboard.
 *
 * Editing a note fires `modify` and `changed` many times a second, so every
 * notification is held back until things go quiet for a moment and then sent
 * once. Renames are reported straight away, before that wait, so the dashboard
 * can keep a moved file's identity.
 */
import { debounce, type App, type EventRef } from "obsidian";

export interface VaultWatchHandlers {
  /** Files were created, deleted or moved: the tree needs rebuilding. */
  onStructure: () => void;
  /** File contents, links, tags or properties changed: details need re-reading. */
  onMetadata: () => void;
  /** A file or folder was renamed or moved. Called at once, not held back. */
  onRename: (oldPath: string, newPath: string) => void;
}

/** How long the vault must be quiet before the dashboard updates. */
export const CHANGE_DELAY_MS = 150;

/** Starts listening and returns a function that stops. */
export function watchVault(
  app: App,
  handlers: VaultWatchHandlers,
  delayMs: number = CHANGE_DELAY_MS,
): () => void {
  const { vault, metadataCache } = app;
  // `true` restarts the wait on every call, so a burst of events sends one update.
  const structure = debounce(handlers.onStructure, delayMs, true);
  const metadata = debounce(handlers.onMetadata, delayMs, true);

  const vaultRefs: EventRef[] = [
    vault.on("create", () => structure()),
    vault.on("delete", () => structure()),
    vault.on("rename", (file, oldPath) => {
      handlers.onRename(oldPath, file.path);
      structure();
    }),
    vault.on("modify", () => metadata()),
  ];
  const cacheRefs: EventRef[] = [
    metadataCache.on("changed", () => metadata()),
    metadataCache.on("resolved", () => metadata()),
  ];

  return () => {
    vaultRefs.forEach((ref) => vault.offref(ref));
    cacheRefs.forEach((ref) => metadataCache.offref(ref));
    structure.cancel();
    metadata.cancel();
  };
}
