/**
 * The notice shown after an edit: what happened, and an Undo button for about seven seconds.
 *
 * Kept apart from the controller because it is the one place that builds DOM for a notice.
 */
import { Notice } from "obsidian";

/** How long the Undo button stays available (SPEC.md section 8). */
export const UNDO_NOTICE_MS = 7000;

export function showUndoNotice(message: string, onUndo: () => void): Notice {
  let notice: Notice | null = null;
  const fragment = createFragment((frag) => {
    frag.createSpan({ text: `${message} ` });
    const button = frag.createEl("button", { text: "Undo", cls: "island-undo-button" });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      notice?.hide();
      onUndo();
    });
  });
  notice = new Notice(fragment, UNDO_NOTICE_MS);
  return notice;
}
