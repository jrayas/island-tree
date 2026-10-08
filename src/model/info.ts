/**
 * The text of the info panel for the selected card.
 *
 * Pure, so the wording can be tested. Milestone 4 adds the modified date, size,
 * link counts, tags and status for files.
 */
import { CATEGORY_STYLES, fileCategory } from "./fileType";
import { ancestry, type TreeNode } from "./tree";

export interface SelectionInfo {
  title: string;
  /** The vault path written as "Vault / Folder / Note.md". */
  path: string;
  /** Short lines under the path. */
  details: string[];
}

export const NOTHING_SELECTED =
  "Select a card to see its details. Double-click a file to open it, or a folder to focus on it.";

/** The path from the vault root to a node, joined with " / " for reading. */
export function pathLabel(node: TreeNode): string {
  return ancestry(node)
    .map((n) => n.name)
    .join(" / ");
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Describes the selected node, or returns null when nothing is selected. */
export function describeSelection(node: TreeNode | null): SelectionInfo | null {
  if (!node) return null;
  if (node.kind === "folder") {
    const folders = node.children.filter((c) => c.kind === "folder").length;
    const files = node.children.length - folders;
    return {
      title: node.name,
      path: pathLabel(node),
      details: [`Folder`, `${plural(folders, "subfolder", "subfolders")}, ${plural(files, "file", "files")}`],
    };
  }
  return {
    title: node.name,
    path: pathLabel(node),
    details: [CATEGORY_STYLES[fileCategory(node.name)].label],
  };
}
