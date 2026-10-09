<script lang="ts">
  // A curved, dashed branch, vertical or radial. The highlighted path back to the root flows faster.
  import { BaseEdge, type EdgeProps } from "@xyflow/svelte";
  import { branchPath } from "../layout/edgePath";
  import type { CurveStyle, Point } from "../layout/types";

  let { id, sourceX, sourceY, targetX, targetY, data }: EdgeProps = $props();

  // A radial layout passes its centre, which its branches curve around.
  const centre = $derived((data?.centre as Point | null | undefined) ?? null);
  const curve = $derived((data?.curve as CurveStyle | undefined) ?? "curved");
  const path = $derived(branchPath(curve, centre, sourceX, sourceY, targetX, targetY));
  const highlighted = $derived(data?.highlight === true);
</script>

<BaseEdge
  {id}
  {path}
  interactionWidth={0}
  class={highlighted ? "island-edge island-edge-highlight" : "island-edge"}
/>
