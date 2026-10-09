/**
 * File details shown on cards and in the info panel: age, size, links, tags, status.
 *
 * Everything here is pure. The Obsidian-specific reading lives in `metaSource.ts`,
 * which produces the plain `FileMeta` these functions turn into text.
 */

/** What is known about one file, as read from the vault and the metadata cache. */
export interface FileMeta {
  /** Last modified, as a unix timestamp in milliseconds. */
  mtime: number;
  /** Size in bytes. */
  size: number;
  /** Number of distinct notes this file links to. */
  outgoing: number;
  /** Number of distinct notes that link to this file. */
  incoming: number;
  /** Tags with their leading "#". */
  tags: string[];
  /** The value of the status property, or null when absent or blank. */
  status: string | null;
}

export type Recency = "today" | "week" | "older";
export type StatusKind = "done" | "review" | "other";

/** Everything a card and the info panel need, already worded. */
export interface MetaDisplay {
  recency: Recency;
  /** "today" or "3d ago". */
  age: string;
  /** "1.2 KB". */
  size: string;
  /** Outgoing plus incoming links, the number shown on a card. */
  links: number;
  outgoing: number;
  incoming: number;
  tags: string[];
  status: string | null;
  statusKind: StatusKind;
  /** The full modified date, for the info panel. */
  modified: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Whole calendar days between a modified time and now, never negative. */
export function daysSince(mtime: number, now: number): number {
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(mtime)) / DAY_MS));
}

/** Green for edited today, amber within the last 7 days, grey for older. */
export function recencyOf(mtime: number, now: number): Recency {
  const days = daysSince(mtime, now);
  if (days === 0) return "today";
  return days <= 7 ? "week" : "older";
}

export function ageLabel(mtime: number, now: number): string {
  const days = daysSince(mtime, now);
  return days === 0 ? "today" : `${days}d ago`;
}

/** Bytes as B, KB or MB, with one decimal only where it helps (under 10). */
export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const round = (value: number): string => (value < 10 ? value.toFixed(1) : String(Math.round(value)));
  const kb = bytes / 1024;
  if (kb < 1024) return `${round(kb)} KB`;
  return `${round(kb / 1024)} MB`;
}

/** Done is green, review is blue, any other status is amber, as in the mockup. */
export function statusKind(status: string): StatusKind {
  const value = status.trim().toLowerCase();
  if (value === "done") return "done";
  if (value === "review") return "review";
  return "other";
}

/**
 * Reads the status from frontmatter. Accepts a string, a number, or the first
 * item of a list, because people write all three. Anything blank is no status.
 */
export function statusOf(frontmatter: unknown, property: string): string | null {
  if (typeof frontmatter !== "object" || frontmatter === null || property === "") return null;
  let value: unknown = (frontmatter as Record<string, unknown>)[property];
  if (Array.isArray(value)) value = value[0];
  if (typeof value === "number") value = String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export interface LinkIndex {
  outgoing: ReadonlyMap<string, number>;
  incoming: ReadonlyMap<string, number>;
}

/**
 * Counts links per file from Obsidian's `resolvedLinks` (source path to target
 * path to count). It counts distinct linked notes rather than every mention, and
 * inverts the map once, so looking up backlinks is a map read, not a scan of the
 * whole vault for every card.
 */
export function buildLinkIndex(resolvedLinks: Readonly<Record<string, Readonly<Record<string, number>>>>): LinkIndex {
  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  for (const [source, targets] of Object.entries(resolvedLinks)) {
    const distinct = Object.keys(targets);
    if (distinct.length > 0) outgoing.set(source, distinct.length);
    for (const target of distinct) {
      incoming.set(target, (incoming.get(target) ?? 0) + 1);
    }
  }
  return { outgoing, incoming };
}

/** Turns raw file details into the wording cards and the info panel show. */
export function describeMeta(meta: FileMeta, now: number): MetaDisplay {
  return {
    recency: recencyOf(meta.mtime, now),
    age: ageLabel(meta.mtime, now),
    size: sizeLabel(meta.size),
    links: meta.outgoing + meta.incoming,
    outgoing: meta.outgoing,
    incoming: meta.incoming,
    tags: meta.tags,
    status: meta.status,
    statusKind: meta.status === null ? "other" : statusKind(meta.status),
    modified: new Date(meta.mtime).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

/** Which pieces of file detail a card's second row may show. */
export interface CardShow {
  /** The recency dot and the age. */
  age: boolean;
  size: boolean;
  links: boolean;
  status: boolean;
}

/** The second row of a detailed card, ready to draw. */
export interface CardRow {
  /** Recency dot colour, or null when ages are hidden. */
  dot: Recency | null;
  /** Age, size and links joined with " · ", or an empty string. */
  text: string;
  status: { label: string; kind: StatusKind } | null;
}

/**
 * Chooses what the second row of a detailed card shows, following the settings.
 * Returns null when everything is switched off, so the card draws no empty row.
 */
export function cardRow(meta: MetaDisplay, show: CardShow): CardRow | null {
  const parts: string[] = [];
  if (show.age) parts.push(meta.age);
  if (show.size) parts.push(meta.size);
  if (show.links) parts.push(`${meta.links} ${meta.links === 1 ? "link" : "links"}`);
  const row: CardRow = {
    dot: show.age ? meta.recency : null,
    text: parts.join(" · "),
    status: show.status && meta.status ? { label: meta.status, kind: meta.statusKind } : null,
  };
  return row.dot === null && row.text === "" && row.status === null ? null : row;
}
