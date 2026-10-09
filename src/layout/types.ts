/**
 * Shared shapes for the layout engines.
 *
 * Layouts take any tree with an `id` and `children`, so they stay free of UI and
 * vault code and can be unit tested on their own (SPEC.md section 5).
 */

export type LayoutMode = "vertical" | "radial" | "mindmap";

/** The two ways the mind map layout can be drawn. */
export type MindMapView = "balanced" | "oneSided";

/** Which side of the root a mind map card is on. */
export type MindSide = "left" | "right";

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
  /** Mind map only: the side of the root each card is on, so branches use the right card edges. */
  sides?: Map<string, MindSide>;
  /**
   * The box the camera should frame, when it is not simply the box around the cards. The
   * balanced mind map sets it symmetric about the root, so the root stays in the middle of
   * the view even when one side is shallower than the other.
   */
  frame?: { x: number; y: number; width: number; height: number };
}
