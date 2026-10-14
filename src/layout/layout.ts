/**
 * Picks the layout for the current mode and works out the card size for it.
 *
 * The settings give one card width and height, for the plain vertical card. The
 * other sizes follow from it with the ratios of the mockup's sizes (116×40,
 * 168×58, 88×30 and 132×48), so at the defaults they come out exactly as in the
 * mockup. Radial cards are smaller because they sit on rings with less room
 * between neighbours; detailed cards are bigger because they carry a second row.
 */
import { layoutMindMap } from "./mindmap";
import { layoutRadial } from "./radial";
import type { LayoutMode, LayoutNode, LayoutResult, MindMapView } from "./types";
import { layoutVertical } from "./vertical";

export interface CardSize {
  width: number;
  height: number;
}

/** [width ratio, height ratio] against the plain vertical card. */
const SIZE_RATIOS: Readonly<Record<LayoutMode, { normal: [number, number]; detailed: [number, number] }>> = {
  vertical: { normal: [1, 1], detailed: [1.45, 1.45] },
  radial: { normal: [0.76, 0.75], detailed: [1.14, 1.2] },
  // The mind map keeps the plain card size; only positions and branches differ.
  mindmap: { normal: [1, 1], detailed: [1.45, 1.45] },
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
  /** Which mind map view to draw; only the mind map layout reads it. Defaults to balanced. */
  mindMapView?: MindMapView;
}

/** The mind map's columns are this many times the level spacing apart, so branches have room to curve. */
export const MIND_MAP_COLUMN_FACTOR = 2;

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
  let result: LayoutResult;
  if (mode === "radial") {
    result = layoutRadial(root, {
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      gap: Math.round(options.gap / 2),
      radii: ringRadii(options.ringRadius),
      ringStep: options.ringStep,
      scale: detail ? DETAILED_RING_SCALE : 1,
    });
  } else if (mode === "mindmap") {
    result = layoutMindMap(root, {
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      rowGap: options.gap,
      columnGap: options.levelGap * MIND_MAP_COLUMN_FACTOR,
      view: options.mindMapView ?? "balanced",
    });
  } else {
    result = layoutVertical(root, {
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      gap: options.gap,
      levelGap: options.levelGap,
    });
  }
  return { ...result, cardSize };
}
