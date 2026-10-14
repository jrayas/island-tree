<script lang="ts">
  // A curved, dashed, flowing branch: vertical, radial, or in the mind map layout running from
  // card edge to card edge. The highlighted path back to the root flows faster.
  import { BaseEdge, type EdgeProps } from "@xyflow/svelte";
  import { branchPath, fadeInFraction, mindMapPath } from "../layout/edgePath";
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

  // A parent with many children sends its branches out from one spot, and where they overlap they
  // would draw a thick bar. Those branches fade in along their length instead. The path to the
  // selected card keeps its whole line.
  const gradientId = $props.id();
  const fan = $derived((data?.fan as number | undefined) ?? 0);
  const fade = $derived(highlighted ? 0 : fadeInFraction(fan));
  const long = $derived(Math.hypot(targetX - sourceX, targetY - sourceY) >= 1);
  const fading = $derived(fade > 0 && long);
</script>

{#if fading}
  <defs>
    <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
      <stop offset="0" style="stop-color: var(--text-faint); stop-opacity: 0" />
      <stop offset={fade} style="stop-color: var(--text-faint); stop-opacity: 1" />
    </linearGradient>
  </defs>
{/if}
<BaseEdge
  {id}
  {path}
  interactionWidth={0}
  class={highlighted ? "island-edge island-edge-highlight" : "island-edge"}
  style={fading ? `stroke: url(#${gradientId})` : undefined}
/>
