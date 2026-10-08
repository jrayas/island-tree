/**
 * Reads the real vault into the plain `RawEntry` shape.
 *
 * The only model file that imports Obsidian, so the rest of the model can be
 * tested without it. Reads through the documented `Vault` and `TFolder` APIs.
 */
import { TFolder, type TAbstractFile, type Vault } from "obsidian";
import type { RawEntry } from "./tree";

function toRaw(file: TAbstractFile): RawEntry {
  if (file instanceof TFolder) {
    return { name: file.name, path: file.path, children: file.children.map(toRaw) };
  }
  return { name: file.name, path: file.path };
}

/**
 * Describes the whole vault. The root is named after the vault because the root
 * folder's own name is empty. Milestone 4 builds children lazily and listens for
 * changes; for now the full tree is read each time the dashboard opens.
 */
export function readVault(vault: Vault): RawEntry {
  return {
    name: vault.getName(),
    path: "/",
    children: vault.getRoot().children.map(toRaw),
  };
}
