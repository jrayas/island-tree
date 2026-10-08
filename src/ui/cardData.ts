/**
 * The data a card receives from the canvas.
 *
 * A `type`, not an interface, because Svelte Flow requires node data to be a
 * string-keyed record. Plain values only: no functions (see context.ts).
 */
import type { CardDisplay } from "../model/display";

export type CardData = {
  display: CardDisplay;
  selected: boolean;
};

/** One card on the canvas, with where it hangs in the tree. */
export type CanvasItem = {
  id: string;
  parentId: string | null;
  /** True when this card is on the path from the selected card back to the root. */
  highlight: boolean;
  data: CardData;
};
