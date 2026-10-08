/**
 * Reads file details from Obsidian: modified time and size from the file, links
 * from `metadataCache.resolvedLinks`, tags and the status property from the
 * file's cached metadata.
 *
 * Reads happen only for the cards on screen, so a large vault costs nothing for
 * files nobody is looking at. The link index is built once and kept until a
 * change makes it stale.
 */
import { getAllTags, type App } from "obsidian";
import { buildLinkIndex, statusOf, type FileMeta, type LinkIndex } from "./meta";

export class MetaReader {
  private links: LinkIndex | null = null;

  constructor(
    private readonly app: App,
    private readonly statusProperty: () => string,
  ) {}

  /** Forgets the link index. Call when links may have changed. */
  invalidate(): void {
    this.links = null;
  }

  /** Details for a vault file, or null when the path is not a file (any more). */
  read(path: string): FileMeta | null {
    const file = this.app.vault.getFileByPath(path);
    if (!file) return null;

    const cache = this.app.metadataCache.getFileCache(file);
    this.links ??= buildLinkIndex(this.app.metadataCache.resolvedLinks);
    const tags = cache ? (getAllTags(cache) ?? []) : [];

    return {
      mtime: file.stat.mtime,
      size: file.stat.size,
      outgoing: this.links.outgoing.get(path) ?? 0,
      incoming: this.links.incoming.get(path) ?? 0,
      tags: [...new Set(tags)],
      status: statusOf(cache?.frontmatter, this.statusProperty()),
    };
  }
}
