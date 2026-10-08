<script lang="ts">
  // A curved, dashed branch. The highlighted path back to the root flows faster.
  import { BaseEdge, type EdgeProps } from "@xyflow/svelte";
  import { verticalBranchPath } from "../layout/edgePath";

  let { id, sourceX, sourceY, targetX, targetY, data }: EdgeProps = $props();

  const path = $derived(verticalBranchPath(sourceX, sourceY, targetX, targetY));
  const highlighted = $derived(data?.highlight === true);
</script>

<BaseEdge
  {id}
  {path}
  interactionWidth={0}
  class={highlighted ? "island-edge island-edge-highlight" : "island-edge"}
/>
