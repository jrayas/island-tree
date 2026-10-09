/**
 * The rules for editing the vault from the dashboard, as pure functions.
 *
 * Everything that decides whether an edit is allowed lives here, so the awkward cases
 * (a move into a folder's own subfolder, a name that clashes, a trailing dot) are unit
 * tested without Obsidian. The Obsidian-facing code in `controller.ts` only asks these
 * questions and then calls the vault. Paths are vault paths: the root is "/" and every
 * other path has no leading slash, as in Obsidian.
 */

export const ROOT_PATH = "/";

/** Characters Obsidian does not allow in a file or folder name. */
const FORBIDDEN = /[\\/:*?"<>|]/;
// eslint-disable-next-line no-control-regex -- control characters are exactly what is being rejected
const CONTROL = /[\u0000-\u001f]/;
const MAX_NAME_LENGTH = 255;

/** The folder a path sits in. Top-level items are in the root. */
export function parentOf(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut <= 0 ? ROOT_PATH : path.slice(0, cut);
}

/** The path of an item called `name` inside `folder`. */
export function joinPath(folder: string, name: string): string {
  return folder === ROOT_PATH || folder === "" ? name : `${folder}/${name}`;
}

/** Splits "Plan.md" into "Plan" and ".md". A leading dot, or no dot, means no extension. */
export function splitExtension(name: string): { base: string; extension: string } {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? { base: name.slice(0, dot), extension: name.slice(dot) } : { base: name, extension: "" };
}

/**
 * Why `name` cannot be used, or null when it is fine. `siblings` are the names already in
 * the folder, compared ignoring case because many file systems do. `own` is the item's
 * current name when renaming, so keeping or re-casing it is not a clash with itself.
 */
export function validateName(name: string, siblings: Iterable<string>, own?: string): string | null {
  if (name.trim() === "") return "Enter a name.";
  if (name.length > MAX_NAME_LENGTH) return "That name is too long.";
  if (FORBIDDEN.test(name) || CONTROL.test(name)) {
    return 'A name cannot contain any of these characters: \\ / : * ? " < > |';
  }
  if (name.startsWith(".")) return "A name cannot start with a dot.";
  if (/[. ]$/.test(name)) return "A name cannot end with a dot or a space.";
  const lower = name.toLowerCase();
  if (own !== undefined && own.toLowerCase() === lower) return null;
  for (const sibling of siblings) {
    if (sibling.toLowerCase() === lower) return "A file or folder with that name already exists here.";
  }
  return null;
}

/** The path an item gets when its name (without the extension, for a file) becomes `base`. */
export function renamedPath(path: string, base: string, kind: "file" | "folder"): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const extension = kind === "file" ? splitExtension(name).extension : "";
  return joinPath(parentOf(path), base + extension);
}

/** The first of "Untitled", "Untitled 1", "Untitled 2" and so on that is not already taken. */
export function uniqueName(base: string, extension: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((name) => name.toLowerCase()));
  let candidate = base;
  for (let number = 1; used.has((candidate + extension).toLowerCase()); number++) {
    candidate = `${base} ${number}`;
  }
  return candidate;
}

export type MoveCheck = { ok: true } | { ok: false; reason: string };

/**
 * Whether the item can move into `targetFolder`, whose current contents are `targetNames`.
 * Refuses the same parent, itself, its own descendant and a clashing name, each with a
 * message fit for a toast.
 */
export function checkMove(
  source: { path: string; name: string },
  targetFolder: string,
  targetNames: Iterable<string>,
): MoveCheck {
  if (source.path === ROOT_PATH) return { ok: false, reason: "The vault itself cannot be moved." };
  if (targetFolder === source.path) return { ok: false, reason: "A folder cannot be moved into itself." };
  if (targetFolder.startsWith(`${source.path}/`)) {
    return { ok: false, reason: "A folder cannot be moved into one of its own subfolders." };
  }
  if (targetFolder === parentOf(source.path)) return { ok: false, reason: "It is already in that folder." };
  const lower = source.name.toLowerCase();
  for (const name of targetNames) {
    if (name.toLowerCase() === lower) {
      return { ok: false, reason: `There is already a file or folder called "${source.name}" in that folder.` };
    }
  }
  return { ok: true };
}

/** A folder holding more files than the threshold needs an extra confirmation. */
export function needsConfirmation(fileCount: number, threshold: number): boolean {
  return fileCount > threshold;
}

/** True when the dashboard has been left alone long enough to lock again. 0 minutes means never. */
export function relockDue(lastEditAt: number, now: number, minutes: number): boolean {
  return minutes > 0 && now - lastEditAt >= minutes * 60_000;
}

/** Anything shaped like a tree node: a kind and children. */
export interface CountableNode {
  kind: string;
  children: readonly CountableNode[];
}

/** How many files are inside a node, however deep. */
export function countFiles(node: CountableNode): number {
  let total = 0;
  const stack: CountableNode[] = [node];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.kind === "file") total += 1;
    stack.push(...current.children);
  }
  return total;
}
