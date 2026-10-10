/**
 * Keyboard movement through the visible cards.
 *
 * The keys follow the usual tree view (as in Obsidian's own file explorer): Up and Down move
 * through the cards in reading order, Right opens a folder and then steps into it, Left closes
 * it and then steps out to its parent, Home and End jump to the first and last card, and Enter
 * does what a double click does. (F, which shows or hides a folder's files, is handled by the app.)
 * Pure, so every rule can be tested without a browser.
 */

/** What navigation needs to know about one visible card. */
export interface NavItem {
  id: string;
  kind: "folder" | "file" | "more";
  parentId: string | null;
  /** Folders only: the folder is open. */
  isOpen: boolean;
}

export type NavAction =
  | { type: "select"; id: string }
  | { type: "open"; id: string }
  | { type: "close"; id: string }
  | { type: "activate"; id: string };

/** The keys this module handles, so the caller knows which presses to claim. */
export const NAV_KEYS: readonly string[] = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"];

/**
 * What a key press does. \`items\` lists the visible cards in reading order (parents before
 * children); \`current\` is the selected card, or null. Returns null when the key does nothing here
 * (for example Down on the last card), which is not the same as the key not being handled.
 */
export function navigate(key: string, items: readonly NavItem[], current: string | null): NavAction | null {
  if (!NAV_KEYS.includes(key) || items.length === 0) return null;
  const position = current === null ? -1 : items.findIndex((item) => item.id === current);
  const here = position === -1 ? undefined : items[position];

  const select = (item: NavItem | undefined): NavAction | null => (item ? { type: "select", id: item.id } : null);

  // With nothing selected, moving starts from an end: forwards keys from the first card,
  // backwards keys from the last.
  if (!here) {
    if (key === "ArrowUp" || key === "End") return select(items[items.length - 1]);
    if (key === "Enter" || key === "ArrowLeft") return null;
    return select(items[0]);
  }

  switch (key) {
    case "ArrowDown":
      return select(items[position + 1]);
    case "ArrowUp":
      return select(items[position - 1]);
    case "Home":
      return select(items[0]);
    case "End":
      return select(items[items.length - 1]);
    case "ArrowRight":
      if (here.kind !== "folder") return null;
      if (!here.isOpen) return { type: "open", id: here.id };
      return select(items.find((item) => item.parentId === here.id));
    case "ArrowLeft":
      if (here.kind === "folder" && here.isOpen && here.parentId !== null) return { type: "close", id: here.id };
      return select(items.find((item) => item.id === here.parentId));
    case "Enter":
      return { type: "activate", id: here.id };
    default:
      return null;
  }
}
