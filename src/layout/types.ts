/**
 * Shared shapes for the layout engines.
 *
 * Layouts take any tree with an `id` and `children`, so they stay free of UI and
 * vault code and can be unit tested on their own (SPEC.md section 5).
 */

export type LayoutMode = "vertical" | "radial";

/** How a branch leaves one card and reaches the next. */
export type CurveStyle = "curved" | "step" | "straight";

export interface LayoutNode {
  id: string;
  children: readonly LayoutNode[];
}

/** The centre of a card, in canvas units. */
export interface Point {
  x: number;
  y: number;
}

export interface LayoutResult {
  /** Card centres by node id. */
  positions: Map<string, Point>;
  /** Total size of the laid-out tree. */
  width: number;
  height: number;
  /** The middle of a radial layout, which its branches curve around. Null for vertical. */
  centre: Point | null;
}
