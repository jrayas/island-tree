<script lang="ts">
  // A curved, dashed branch, vertical or radial. The highlighted path back to the root flows faster.
  import { BaseEdge, type EdgeProps } from "@xyflow/svelte";
  import { radialBranchPath, verticalBranchPath } from "../layout/edgePath";
  import type { Point } from "../layout/types";

  let { id, sourceX, sourceY, targetX, targetY, data }: EdgeProps = $props();

  // A radial layout passes its centre, which its branches curve around.
  const centre = $derived((data?.centre as Point | null | undefined) ?? null);
  const path = $derived(
    centre
      ? radialBranchPath(centre, sourceX, sourceY, targetX, targetY)
      : verticalBranchPath(sourceX, sourceY, targetX, targetY),
  );
  const highlighted = $derived(data?.highlight === true);
</script>

<BaseEdge
  {id}
  {path}
  interactionWidth={0}
  class={highlighted ? "island-edge island-edge-highlight" : "island-edge"}
/>
