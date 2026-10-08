<script lang="ts">
  // Copies the camera's zoom into the shared zoom level the cards read. Must sit
  // inside <SvelteFlow> to reach the viewport. The level only changes when the
  // zoom crosses a threshold, so cards re-render rarely while zooming.
  import { useViewport } from "@xyflow/svelte";
  import { zoomLevel } from "../layout/zoomLevel";
  import { useZoom } from "./context";

  const viewport = useViewport();
  const zoom = useZoom();

  $effect(() => {
    zoom.level = zoomLevel(viewport.current.zoom);
  });
</script>
