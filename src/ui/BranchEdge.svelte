<script lang="ts">
  // A curved, dashed branch, vertical or radial, or in the mind map layout a solid branch from
  // card edge to card edge. The highlighted path back to the root flows faster.
  import { BaseEdge, type EdgeProps } from "@xyflow/svelte";
  import { branchPath, mindMapPath } from "../layout/edgePath";
  import type { CurveStyle, MindSide, Point } from "../layout/types";

  let { id, sourceX, sourceY, targetX, targetY, data }: EdgeProps = $props();

  // A radial layout passes its centre, which its branches curve around.
  const centre = $derived((data?.centre as Point | null | undefined) ?? null);
  const curve = $derived((data?.curve as CurveStyle | undefined) ?? "curved");
  // The mind map passes the card's side of the root and the card width; the others pass neither.
  const side = $derived((data?.side as MindSide | null | undefined) ?? null);
  const cardWidth = $derived((data?.cardWidth as number | undefined) ?? 0);
  const path = $derived(
    side
      ? mindMapPath(curve, side, cardWidth, sourceX, sourceY, targetX, targetY)
      : branchPath(curve, centre, sourceX, sourceY, targetX, targetY),
  );
  const highlighted = $derived(data?.highlight === true);
</script>

<BaseEdge
  {id}
  {path}
  interactionWidth={0}
  class={[
    "island-edge",
    highlighted && "island-edge-highlight",
    side && "island-edge-solid",
  ]}
/>
