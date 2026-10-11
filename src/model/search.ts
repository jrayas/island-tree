/**
 * Marking the cards on screen that match what is typed.
 *
 * This looks only at the cards already drawn, so typing is free however big the vault is and never
 * opens a folder or loads a card. Finding something that is not on screen is the job of the
 * suggestions (suggest.ts) and of going to the chosen card (reveal.ts). Clearing the text puts the
 * cards back as they were.
 */

/** The cards on screen that match, and the cards leading down to them. */
export interface CardMatch {
  /** Cards whose name matches. */
  hits: ReadonlySet<string>;
  /** Cards on screen that have a match somewhere below them, up to the top. */
  ancestors: ReadonlySet<string>;
}

/** The parts of a visible card the matching reads. */
export interface MatchableCard {
  id: string;
  parentId: string | null;
  /** The vault name, or null for a "+N more" card, which is never a match. */
  node: { name: string } | null;
}

/** Trims and lower-cases a query so matching ignores case and stray spaces. */
export function normaliseQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Whether a name matches the query. An empty query matches nothing. */
export function nameMatches(name: string, query: string): boolean {
  const needle = normaliseQuery(query);
  return needle !== "" && name.toLowerCase().includes(needle);
}

/** Finds the matching cards among those on screen. Null means nothing is being searched for. */
export function matchVisible(visible: readonly MatchableCard[], query: string): CardMatch | null {
  const needle = normaliseQuery(query);
  if (needle === "") return null;
  const hits = new Set<string>();
  const ancestors = new Set<string>();
  const parentOf = new Map<string, string | null>();
  for (const card of visible) {
    parentOf.set(card.id, card.parentId);
    if (card.node && card.node.name.toLowerCase().includes(needle)) hits.add(card.id);
  }
  for (const id of hits) {
    for (let up = parentOf.get(id) ?? null; up !== null && !ancestors.has(up); up = parentOf.get(up) ?? null) {
      ancestors.add(up);
    }
  }
  return { hits, ancestors };
}

/**
 * Whether a card should fade while something is typed: anything that is neither a match nor on the
 * way to one. "+N more" cards are never matches, so they fade.
 */
export function isDimmed(id: string, match: CardMatch | null): boolean {
  if (!match) return false;
  return !match.hits.has(id) && !match.ancestors.has(id);
}
