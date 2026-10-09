/**
 * The text of the info panel for the selected card.
 *
 * Pure, so the wording can be tested. Files also show their modified date, size,
 * links, tags and status when the metadata cache has them.
 */
import { CATEGORY_STYLES, fileCategory } from "./fileType";
import type { MetaDisplay } from "./meta";
import { ancestry, type TreeNode } from "./tree";

export interface SelectionInfo {
  title: string;
  /** The vault path written as "Vault / Folder / Note.md". */
  path: string;
  /** Short lines under the path. */
  details: string[];
}

/** The path from the vault root to a node, joined with " / " for reading. */
export function pathLabel(node: TreeNode): string {
  return ancestry(node)
    .map((n) => n.name)
    .join(" / ");
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Describes the selected node, or returns null when nothing is selected. File
 * details are optional because the metadata cache may not have them yet.
 */
export function describeSelection(
  node: TreeNode | null,
  meta: MetaDisplay | null = null,
  options: { tags: boolean } = { tags: true },
): SelectionInfo | null {
  if (!node) return null;
  if (node.kind === "folder") {
    const folders = node.children.filter((c) => c.kind === "folder").length;
    const files = node.children.length - folders;
    return {
      title: node.name,
      path: pathLabel(node),
      details: [`${plural(folders, "subfolder", "subfolders")}, ${plural(files, "file", "files")}`],
    };
  }
  const details = [CATEGORY_STYLES[fileCategory(node.name)].label];
  if (meta) {
    details.push(
      `Modified ${meta.modified} (${meta.age})`,
      `Size ${meta.size}`,
      `${plural(meta.outgoing, "link", "links")} out, ${plural(meta.incoming, "backlink", "backlinks")}`,
    );
    if (options.tags && meta.tags.length > 0) details.push(`Tags: ${meta.tags.join(" ")}`);
    if (meta.status) details.push(`Status: ${meta.status}`);
  }
  return { title: node.name, path: pathLabel(node), details };
}
