/**
 * Maps a file name to a category, an icon and a colour.
 *
 * Colours are Obsidian theme variables rather than hex values so light and dark
 * themes both work (SPEC.md section 6). Icons are Lucide ids, which Obsidian
 * renders through `setIcon`.
 */

export type FileCategory = "markdown" | "code" | "image" | "pdf" | "canvas" | "other";

export interface CategoryStyle {
  /** Lucide icon id. */
  icon: string;
  /** A CSS colour, always a theme variable. */
  colour: string;
  /** Sentence-case name for tooltips and the legend. */
  label: string;
}

export const CATEGORY_STYLES: Readonly<Record<FileCategory, CategoryStyle>> = {
  markdown: { icon: "file-text", colour: "var(--text-accent)", label: "Markdown note" },
  code: { icon: "file-code", colour: "var(--color-purple)", label: "Code or data" },
  image: { icon: "image", colour: "var(--color-green)", label: "Image" },
  pdf: { icon: "file-text", colour: "var(--color-red)", label: "PDF" },
  canvas: { icon: "layout-dashboard", colour: "var(--color-orange)", label: "Canvas" },
  other: { icon: "file", colour: "var(--text-muted)", label: "File" },
};

const CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "css", "html", "yml", "yaml", "py",
]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"]);

/** The lower-case extension without the dot, or an empty string when there is none. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : "";
}

export function fileCategory(name: string): FileCategory {
  const ext = extensionOf(name);
  if (ext === "md") return "markdown";
  if (ext === "pdf") return "pdf";
  if (ext === "canvas") return "canvas";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (CODE_EXTENSIONS.has(ext)) return "code";
  return "other";
}
