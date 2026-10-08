/**
 * Picks the layout for the current mode and holds the card size for each.
 *
 * Radial cards are smaller than vertical ones because they sit on rings with
 * less room between neighbours. The sizes are constants (taken from the mockup)
 * until the settings milestone makes them configurable.
 */
import { DEFAULT_RADII, DEFAULT_RING_STEP, layoutRadial } from "./radial";
import type { LayoutMode, LayoutNode, LayoutResult } from "./types";
import { layoutVertical } from "./vertical";

export interface CardSize {
  width: number;
  height: number;
}

export const CARD_SIZES: Readonly<Record<LayoutMode, CardSize>> = {
  vertical: { width: 116, height: 40 },
  radial: { width: 88, height: 30 },
};

/** Detailed cards carry a second row, so they are bigger (sizes from the mockup). */
export const DETAILED_CARD_SIZES: Readonly<Record<LayoutMode, CardSize>> = {
  vertical: { width: 168, height: 58 },
  radial: { width: 132, height: 48 },
};

/** Rings spread out by this much for detailed cards, so the bigger cards do not touch. */
export const DETAILED_RING_SCALE = 1.3;

export function cardSizeFor(mode: LayoutMode, detail: boolean): CardSize {
  return (detail ? DETAILED_CARD_SIZES : CARD_SIZES)[mode];
}

const VERTICAL_GAP = 14;
const VERTICAL_LEVEL_GAP = 44;

export interface PlacedLayout extends LayoutResult {
  cardSize: CardSize;
}

export function computeLayout(mode: LayoutMode, root: LayoutNode, detail = false): PlacedLayout {
  const cardSize = cardSizeFor(mode, detail);
  const result =
    mode === "radial"
      ? layoutRadial(root, {
          cardWidth: cardSize.width,
          radii: DEFAULT_RADII,
          ringStep: DEFAULT_RING_STEP,
          scale: detail ? DETAILED_RING_SCALE : 1,
        })
      : layoutVertical(root, {
          cardWidth: cardSize.width,
          cardHeight: cardSize.height,
          gap: VERTICAL_GAP,
          levelGap: VERTICAL_LEVEL_GAP,
        });
  return { ...result, cardSize };
}
