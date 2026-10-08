/**
 * Tidy top-to-bottom layout.
 *
 * Each parent is centred above its children and each level sits one row lower
 * (SPEC.md section 5). A pure function, so it is tested without any UI.
 */
import type { LayoutNode, LayoutResult } from "./types";

export interface VerticalOptions {
  cardWidth: number;
  cardHeight: number;
  /** Horizontal gap between sibling subtrees. */
  gap: number;
  /** Vertical gap between one level and the next. */
  levelGap: number;
}

/**
 * Lays out the tree and returns card centres.
 *
 * A subtree is as wide as its children side by side plus gaps, but never
 * narrower than one card, so a lone child sits directly under its parent.
 * Subtree widths are memoised: measuring them again at every level would make
 * large trees quadratic.
 */
export function layoutVertical(root: LayoutNode, options: VerticalOptions): LayoutResult {
  const { cardWidth, cardHeight, gap, levelGap } = options;
  const widths = new Map<string, number>();

  const childrenSpan = (node: LayoutNode): number => {
    if (node.children.length === 0) return 0;
    let total = gap * (node.children.length - 1);
    for (const child of node.children) total += subtreeWidth(child);
    return total;
  };

  const subtreeWidth = (node: LayoutNode): number => {
    const known = widths.get(node.id);
    if (known !== undefined) return known;
    const width = Math.max(cardWidth, childrenSpan(node));
    widths.set(node.id, width);
    return width;
  };

  const positions: LayoutResult["positions"] = new Map();
  let deepest = 0;

  const place = (node: LayoutNode, left: number, depth: number): void => {
    const width = subtreeWidth(node);
    positions.set(node.id, {
      x: left + width / 2,
      y: depth * (cardHeight + levelGap) + cardHeight / 2,
    });
    deepest = Math.max(deepest, depth);

    let cursor = left + (width - childrenSpan(node)) / 2;
    for (const child of node.children) {
      place(child, cursor, depth + 1);
      cursor += subtreeWidth(child) + gap;
    }
  };

  place(root, 0, 0);
  return {
    positions,
    width: subtreeWidth(root),
    height: deepest * (cardHeight + levelGap) + cardHeight,
    centre: null,
  };
}
