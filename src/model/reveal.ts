/**
 * Going to one card that a search found.
 *
 * Only that card is loaded. The folders on the way to it are opened and pinned, and so is the card
 * itself, so each is shown wherever it sits among its siblings while the rest of a long list stays
 * behind its "+N more" card. Nothing else is revealed, however many other names match the search.
 */
import { ancestry, type TreeNode } from "./tree";
import type { ViewState } from "./viewState";

/**
 * The state with `target` selected and shown. A focus on another part of the vault is left, since
 * the card would be out of sight inside it; a focus that contains the card is kept.
 */
export function revealOne(state: ViewState, target: TreeNode): ViewState {
  const path = ancestry(target);
  const root = path[0];
  if (!root) return state;
  // Every card from the vault root down to the target, not counting the root itself.
  const pinned = new Set(path.slice(1).map((node) => node.uid));
  const open = new Set(state.open);
  for (const node of path.slice(0, -1)) open.add(node.uid);
  const focusHoldsIt = state.focusRoot === root.uid || path.some((node) => node.uid === state.focusRoot);
  return {
    ...state,
    open,
    pinned,
    selected: target.uid,
    focusRoot: focusHoldsIt ? state.focusRoot : root.uid,
    filesOn: focusHoldsIt ? state.filesOn : false,
  };
}
