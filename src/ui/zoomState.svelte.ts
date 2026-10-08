/**
 * The zoom level every card reads, kept as shared reactive state.
 *
 * It lives outside the node data on purpose: zooming changes it many times a
 * second, and putting it in the data would rebuild every card each time.
 */
import type { ZoomLevel } from "../layout/zoomLevel";

export class ZoomState {
  level = $state<ZoomLevel>("normal");
}
