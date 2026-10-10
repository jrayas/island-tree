/**
 * Where a double click should open a file.
 *
 * Separate from `open.ts` so the rule can be unit tested without Obsidian.
 */
import type { OpenNotesIn } from "../settings/schema";

/** "this" replaces the dashboard in its own tab, so Obsidian's Back returns to it. */
export type OpenTarget = "tab" | "split" | "this";

/**
 * Holding Ctrl (or Cmd on a Mac) always opens a split, matching Obsidian's own modifier
 * convention (SPEC.md section 2). Otherwise the "Open notes in" setting decides.
 */
export function openTarget(
  modifiers: { ctrlKey: boolean; metaKey: boolean },
  preference: OpenNotesIn = "tab",
): OpenTarget {
  return modifiers.ctrlKey || modifiers.metaKey ? "split" : preference;
}

/**
 * Where the file can really go. Replacing the dashboard only makes sense in the main area: in a
 * sidebar it would swap the whole panel for a note, so a new tab is used there instead.
 */
export function resolveTarget(target: OpenTarget, inSidebar: boolean): OpenTarget {
  return target === "this" && inSidebar ? "tab" : target;
}
