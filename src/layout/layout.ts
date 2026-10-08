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

const VERTICAL_GAP = 14;
const VERTICAL_LEVEL_GAP = 44;

export interface PlacedLayout extends LayoutResult {
  cardSize: CardSize;
}

export function computeLayout(mode: LayoutMode, root: LayoutNode): PlacedLayout {
  const cardSize = CARD_SIZES[mode];
  const result =
    mode === "radial"
      ? layoutRadial(root, {
          cardWidth: cardSize.width,
          radii: DEFAULT_RADII,
          ringStep: DEFAULT_RING_STEP,
        })
      : layoutVertical(root, {
          cardWidth: cardSize.width,
          cardHeight: cardSize.height,
          gap: VERTICAL_GAP,
          levelGap: VERTICAL_LEVEL_GAP,
        });
  return { ...result, cardSize };
}
