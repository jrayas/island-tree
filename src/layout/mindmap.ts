/**
 * Horizontal "mind map" layouts: a balanced tree that spreads to both sides of the root,
 * and a one-sided tree that grows to the right.
 *
 * Both stack siblings in a column and centre each parent on its children, like the
 * vertical layout turned on its side. Pure functions, so they are tested without any UI.
 */
import type { LayoutNode, LayoutResult, MindMapView, MindSide } from "./types";

export interface MindMapOptions {
  cardWidth: number;
  cardHeight: number;
  /** Vertical gap between stacked siblings. */
  rowGap: number;
  /** Horizontal gap between one column of cards and the next. */
  columnGap: number;
  view: MindMapView;
}

/**
 * How many of the root's branches go on the right, so the two sides come out as close in
 * height as possible. The branches keep their order (the first ones go right, the rest
 * left), so the result reads naturally and does not shuffle siblings; on a tie the right
 * side takes the extra branch. Heights are the stacked heights of each whole branch, so a
 * branch with many descendants counts for more than a lone file.
 */
export function splitBranches(heights: readonly number[], rowGap: number): number {
  const count = heights.length;
  if (count <= 1) return count;
  const total = heights.reduce((sum, h) => sum + h, 0);
  let best = count - 1;
  let bestDifference = Infinity;
  let rightSum = 0;
  for (let k = 1; k < count; k++) {
    rightSum += heights[k - 1] ?? 0;
    const right = rightSum + rowGap * (k - 1);
    const left = total - rightSum + rowGap * (count - k - 1);
    const difference = Math.abs(right - left);
    if (difference <= bestDifference) {
      bestDifference = difference;
      best = k;
    }
  }
  return best;
}

/**
 * Lays out the tree and returns card centres, shifted so the top-left card edge is at 0,0.
 * `sides` records which side of the root each card is on, which the branches need to leave
 * and arrive at the right edge of a card.
 *
 * Subtree heights are memoised, as in the vertical layout, so large trees stay linear.
 * Balanced view: the root is in the middle, its branches are split in order (see
 * `splitBranches`), the right side reads top to bottom and the left side continues from
 * the bottom up, so the order runs clockwise round the root. One-sided view: the root is at
 * the far left, centred on the whole tree, with every level one column further right.
 */
export function layoutMindMap(root: LayoutNode, options: MindMapOptions): LayoutResult {
  const { cardWidth, cardHeight, rowGap, columnGap, view } = options;
  const columnStep = cardWidth + columnGap;
  const heights = new Map<string, number>();

  const childrenSpan = (node: LayoutNode): number => {
    if (node.children.length === 0) return 0;
    let total = rowGap * (node.children.length - 1);
    for (const child of node.children) total += subtreeHeight(child);
    return total;
  };

  const subtreeHeight = (node: LayoutNode): number => {
    const known = heights.get(node.id);
    if (known !== undefined) return known;
    const height = Math.max(cardHeight, childrenSpan(node));
    heights.set(node.id, height);
    return height;
  };

  const positions: LayoutResult["positions"] = new Map();
  const sides = new Map<string, MindSide>();

  const place = (node: LayoutNode, top: number, depth: number, side: MindSide): void => {
    const height = subtreeHeight(node);
    const direction = side === "right" ? 1 : -1;
    positions.set(node.id, { x: direction * depth * columnStep, y: top + height / 2 });
    if (depth > 0) sides.set(node.id, side);
    let cursor = top + (height - childrenSpan(node)) / 2;
    for (const child of node.children) {
      place(child, cursor, depth + 1, side);
      cursor += subtreeHeight(child) + rowGap;
    }
  };

  const placeColumn = (branches: readonly LayoutNode[], side: MindSide): void => {
    let span = rowGap * Math.max(0, branches.length - 1);
    for (const branch of branches) span += subtreeHeight(branch);
    let cursor = -span / 2; // centred on the root, which sits at y = 0
    for (const branch of branches) {
      place(branch, cursor, 1, side);
      cursor += subtreeHeight(branch) + rowGap;
    }
  };

  if (view === "oneSided") {
    place(root, 0, 0, "right");
  } else {
    positions.set(root.id, { x: 0, y: 0 });
    const split = splitBranches(root.children.map(subtreeHeight), rowGap);
    placeColumn(root.children.slice(0, split), "right");
    placeColumn(root.children.slice(split).reverse(), "left");
  }

  // Shift everything so the outer card edges start at 0, 0, as the other layouts do. In the
  // balanced view the root is at x = 0, so mirroring the longer side makes the root the middle.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of positions.values()) {
    minX = Math.min(minX, x - cardWidth / 2);
    maxX = Math.max(maxX, x + cardWidth / 2);
    minY = Math.min(minY, y - cardHeight / 2);
    maxY = Math.max(maxY, y + cardHeight / 2);
  }
  const balanced = view === "balanced";
  if (balanced) {
    const half = Math.max(-minX, maxX);
    minX = -half;
    maxX = half;
  }
  for (const [id, { x, y }] of positions) positions.set(id, { x: x - minX, y: y - minY });

  const width = maxX - minX;
  const height = maxY - minY;
  return {
    positions,
    width,
    height,
    centre: null,
    sides,
    frame: balanced ? { x: 0, y: 0, width, height } : undefined,
  };
}
