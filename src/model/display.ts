/**
 * Turns a visible item into what its card shows.
 *
 * Kept out of the Svelte component so the wording, counts and tooltips can be
 * unit tested, and so the card stays a plain view of this data.
 */
import { CATEGORY_STYLES, fileCategory } from "./fileType";
import type { MetaDisplay } from "./meta";
import { FOLDER_CEILING } from "./limits";
import { filesVisible, type VisibilityState, type VisibleNode } from "./visibility";

export interface CardDisplay {
  kind: VisibleNode["kind"];
  label: string;
  /** Lucide icon id, or null for a "+N more" pill. */
  icon: string | null;
  /** CSS colour for the icon, or null to use the card's own colour. */
  colour: string | null;
  /** Folders only: number of subfolders and files inside. */
  subfolders: number;
  files: number;
  /** Folders only: total children, for the detail row ("5 items"). */
  items: number;
  isOpen: boolean;
  /** Folders only: whether this folder currently lists its files. */
  filesShown: boolean;
  tooltip: string;
  /** Pills only: nothing more can be shown here, so the card does nothing when clicked. */
  capped?: boolean;
}

/**
 * What a screen reader says for a card: its name and kind, whether a folder is open, and what
 * it holds. The card's own text is only a short label and badge numbers like "1·3".
 */
export function describeForReader(display: CardDisplay): string {
  if (display.kind === "more") {
    return display.capped
      ? `${display.label}. ${display.tooltip}`
      : `${display.label}. Press Enter to show more.`;
  }
  if (display.kind === "folder") {
    const holds = `${plural(display.subfolders, "folder", "folders")} and ${plural(display.files, "file", "files")}`;
    return `${display.label}, folder, ${display.isOpen ? "open" : "closed"}, ${holds}`;
  }
  return `${display.label}, file`;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * What a card shows for one item. File details are optional: they come from the
 * metadata cache and may not be available, in which case the card still works.
 * `options.tags` follows the Show tags setting.
 */
export function describeItem(
  item: VisibleNode,
  state: VisibilityState,
  meta: MetaDisplay | null = null,
  options: { tags: boolean } = { tags: true },
): CardDisplay {
  if (item.kind === "more" || !item.node) {
    return {
      kind: "more",
      label: item.capped ? `${item.hidden} not shown` : `+${item.hidden} more`,
      icon: null,
      colour: null,
      subfolders: 0,
      files: 0,
      items: 0,
      isOpen: false,
      filesShown: false,
      capped: item.capped === true,
      tooltip: item.capped
        ? `${plural(item.hidden, "more item", "more items")} not shown, because a folder shows at most ${FOLDER_CEILING} at once. Search to find them.`
        : `Show more (${plural(item.hidden, "item", "items")} hidden)`,
    };
  }

  const { node } = item;
  if (node.kind === "folder") {
    const subfolders = node.children.filter((c) => c.kind === "folder").length;
    const files = node.children.length - subfolders;
    const isOpen = state.open.has(node.uid);
    const filesShown = filesVisible(state, node.uid);
    return {
      kind: "folder",
      label: node.name,
      icon: isOpen ? "folder-open" : "folder",
      colour: null,
      subfolders,
      files,
      items: node.children.length,
      isOpen,
      filesShown,
      tooltip: `${node.name}: ${plural(subfolders, "folder", "folders")}, ${plural(files, "file", "files")} (files ${filesShown ? "shown" : "hidden"})`,
    };
  }

  const style = CATEGORY_STYLES[fileCategory(node.name)];
  let tooltip = `${node.name} (${style.label})`;
  if (meta) {
    tooltip += ` | ${meta.age} | ${meta.size} | ${plural(meta.links, "link", "links")}`;
    if (options.tags && meta.tags.length > 0) tooltip += ` | ${meta.tags.join(" ")}`;
    if (meta.status) tooltip += ` | status: ${meta.status}`;
  }
  return {
    kind: "file",
    label: node.name,
    icon: style.icon,
    colour: style.colour,
    subfolders: 0,
    files: 0,
    items: 0,
    isOpen: false,
    filesShown: false,
    tooltip,
  };
}
