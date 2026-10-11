/**
 * Lets the "Toggle auto-scroll" command reach the dashboard, which owns auto-scroll. The app sets
 * `toggle` while it is mounted and clears it when it goes. Same idea as the lock bridge.
 */
export interface ScrollBridge {
  toggle: (() => void) | null;
}
