/**
 * Picks the layout for the current mode and works out the card size for it.
 *
 * The settings give one card width and height, for the plain vertical card. The
 * other sizes follow from it with the ratios of the mockup's sizes (116×40,
 * 168×58, 88×30 and 132×48), so at the defaults they come out exactly as in the
 * mockup. Radial cards are smaller because they sit on rings with less room
 * between neighbours; detailed cards are bigger because they carry a second row.
 */
import { layoutRadial } from "./radial";
import type { LayoutMode, LayoutNode, LayoutResult } from "./types";
import { layoutVertical } from "./vertical";

export interface CardSize {
  width: number;
  height: number;
}

/** [width ratio, height ratio] against the plain vertical card. */
const SIZE_RATIOS: Readonly<Record<LayoutMode, { normal: [number, number]; detailed: [number, number] }>> = {
  vertical: { normal: [1, 1], detailed: [1.45, 1.45] },
  radial: { normal: [0.76, 0.75], detailed: [1.14, 1.2] },
};

/** Rings after the first sit at these multiples of its radius (the mockup's 125, 235, 335, 425). */
const RING_MULTIPLES: readonly number[] = [0, 1, 1.88, 2.68, 3.4];

/** Rings spread out by this much for detailed cards, so the bigger cards do not touch. */
export const DETAILED_RING_SCALE = 1.3;

/** The geometry settings the layouts need. */
export interface LayoutOptions {
  /** Width and height of the plain vertical card. */
  cardWidth: number;
  cardHeight: number;
  /** Horizontal space between cards in the vertical layout. */
  gap: number;
  /** Vertical space between levels in the vertical layout. */
  levelGap: number;
  /** Distance to the first ring in the radial layout. */
  ringRadius: number;
  /** Extra distance for each ring beyond the configured ones. */
  ringStep: number;
}

export function cardSizeFor(
  mode: LayoutMode,
  detail: boolean,
  cardWidth: number,
  cardHeight: number,
): CardSize {
  const [wr, hr] = SIZE_RATIOS[mode][detail ? "detailed" : "normal"];
  return { width: Math.round(cardWidth * wr), height: Math.round(cardHeight * hr) };
}

/** Ring distances for the radial layout, scaled from the first ring's radius. */
export function ringRadii(firstRing: number): number[] {
  return RING_MULTIPLES.map((multiple) => Math.round(firstRing * multiple * 100) / 100);
}

export interface PlacedLayout extends LayoutResult {
  cardSize: CardSize;
}

export function computeLayout(
  mode: LayoutMode,
  root: LayoutNode,
  detail: boolean,
  options: LayoutOptions,
): PlacedLayout {
  const cardSize = cardSizeFor(mode, detail, options.cardWidth, options.cardHeight);
  const result =
    mode === "radial"
      ? layoutRadial(root, {
          cardWidth: cardSize.width,
          radii: ringRadii(options.ringRadius),
          ringStep: options.ringStep,
          scale: detail ? DETAILED_RING_SCALE : 1,
        })
      : layoutVertical(root, {
          cardWidth: cardSize.width,
          cardHeight: cardSize.height,
          gap: options.gap,
          levelGap: options.levelGap,
        });
  return { ...result, cardSize };
}
