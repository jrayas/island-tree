/**
 * Where a double click should open a file.
 *
 * Separate from `open.ts` so the rule can be unit tested without Obsidian.
 */

export type OpenTarget = "tab" | "split";

/**
 * A plain double click opens a new tab; holding Ctrl (or Cmd on a Mac) opens a
 * split instead, matching Obsidian's own modifier convention (SPEC.md section 2).
 */
export function openTarget(modifiers: { ctrlKey: boolean; metaKey: boolean }): OpenTarget {
  return modifiers.ctrlKey || modifiers.metaKey ? "split" : "tab";
}
