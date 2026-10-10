/**
 * The data a card receives from the canvas.
 *
 * A `type`, not an interface, because Svelte Flow requires node data to be a
 * string-keyed record. Plain values only: no functions (see context.ts).
 */
import type { CardDisplay } from "../model/display";
import type { CardRow } from "../model/meta";

export type CardData = {
  display: CardDisplay;
  selected: boolean;
  /** What a screen reader says for the card. */
  reader: string;
  /** How deep the card is, the vault card being 1. */
  level: number;
  /** The card has just been removed and is fading out where it was. */
  leaving?: boolean;
  /** The card matches the search text. */
  hit: boolean;
  /** A search is active and this card is neither a match nor on the way to one. */
  dim: boolean;
  /** Smaller text and padding, used by the radial layout. */
  compact: boolean;
  /** The Details toggle is on, so close-up cards show a second row. */
  detail: boolean;
  /** The card can be dragged onto a folder: the dashboard is unlocked and dragging is allowed. */
  draggable: boolean;
  /** The detail row for a file, following the Show settings, or null when there is nothing to show. */
  row: CardRow | null;
};

/** One card on the canvas, with where it hangs in the tree. */
export type CanvasItem = {
  id: string;
  parentId: string | null;
  /** True when this card is on the path from the selected card back to the root. */
  highlight: boolean;
  data: CardData;
};
