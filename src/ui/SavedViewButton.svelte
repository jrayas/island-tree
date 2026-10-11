<script lang="ts">
  // The Saved view button, in the control strip below the play button. With no view saved, a click
  // saves the current pan and zoom. With one saved, a click glides back to it from anywhere on the
  // canvas, and a right-click (or the menu key) offers to save the current view again or forget it.
  // It only moves the camera: open folders, the selection and the search stay as they are. Must sit
  // inside <SvelteFlow> so it can reach the viewport.
  import { ControlButton, useSvelteFlow } from "@xyflow/svelte";
  import type { MenuEntry } from "../editing/api";
  import { cameraFromView, viewFromCamera, type SavedCamera } from "../layout/camera";

  let {
    saved,
    width,
    height,
    onsave,
    onmenu,
    onnotice,
  }: {
    /** The view saved for the layout on screen, or null. */
    saved: SavedCamera | null;
    width: number;
    height: number;
    /** Remember this camera for the layout on screen, or forget it when null. */
    onsave: (camera: SavedCamera | null) => void;
    onmenu: (event: MouseEvent, entries: MenuEntry[]) => void;
    onnotice: (message: string) => void;
  } = $props();

  const { getViewport, setViewport } = useSvelteFlow();

  function saveHere(): void {
    if (width === 0 || height === 0) return;
    onsave(cameraFromView(getViewport(), { width, height }));
  }

  function goThere(camera: SavedCamera): void {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void setViewport(viewFromCamera(camera, { width, height }), { duration: reduce ? 0 : 400 });
  }

  function click(): void {
    if (saved) {
      goThere(saved);
      return;
    }
    saveHere();
    onnotice("Saved this view. Click the button to come back to it; right-click for more.");
  }

  function menu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    onmenu(event, [
      {
        label: "Save current view here",
        icon: "bookmark",
        run: () => {
          saveHere();
          onnotice("Saved this view.");
        },
      },
      {
        label: "Go to saved view",
        icon: "map-pin",
        disabled: saved === null,
        run: () => saved && goThere(saved),
      },
      {
        label: "Forget saved view",
        icon: "trash",
        disabled: saved === null,
        run: () => {
          onsave(null);
          onnotice("Forgot the saved view.");
        },
      },
    ]);
  }
</script>

<ControlButton
  class={["island-saved-view", saved && "is-active"]}
  onclick={click}
  oncontextmenu={menu}
  aria-label={saved ? "Go to saved view (right-click for more)" : "Save the current view"}
>
  <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
    <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-4.2L6 20V5.5a1 1 0 0 1 1-1z" />
  </svg>
</ControlButton>
