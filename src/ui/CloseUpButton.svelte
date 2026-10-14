<script lang="ts">
  // The Close-up button, in the control strip below the play button. One click glides to a reading-sized
  // view (full size, zoomed out three clicks of the zoom button) centred on the selected card, or on
  // whatever is in the middle of the pane when nothing is selected. It only moves the camera: open
  // folders, the selection and the search stay as they are. Must sit inside <SvelteFlow> so it can
  // reach the viewport.
  import { ControlButton, useSvelteFlow } from "@xyflow/svelte";
  import { closeUpView, viewCentre } from "../layout/camera";
  import type { Point } from "../layout/types";

  let {
    width,
    height,
    selectedCentre,
  }: {
    width: number;
    height: number;
    /** The middle of the selected card, or null when none is selected or it is not on screen. */
    selectedCentre: () => Point | null;
  } = $props();

  const { getViewport, setViewport } = useSvelteFlow();

  function closeUp(): void {
    if (width === 0 || height === 0) return;
    const pane = { width, height };
    const target = selectedCentre() ?? viewCentre(getViewport(), pane);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void setViewport(closeUpView(target, pane), { duration: reduce ? 0 : 400 });
  }
</script>

<ControlButton
  class="island-close-up"
  onclick={closeUp}
  aria-label="Close-up on the selected card (reading size)"
>
  <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6" />
  </svg>
</ControlButton>
