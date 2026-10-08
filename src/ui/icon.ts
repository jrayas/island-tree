/**
 * Svelte action that draws an Obsidian (Lucide) icon into an element.
 *
 * Uses `setIcon` so icons match the rest of Obsidian and follow its theme.
 */
import { setIcon } from "obsidian";

export function icon(el: HTMLElement, name: string | null): { update: (name: string | null) => void } {
  const apply = (next: string | null): void => {
    el.empty();
    if (next) setIcon(el, next);
  };
  apply(name);
  return { update: apply };
}
