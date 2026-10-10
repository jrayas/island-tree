/**
 * Checks the plugin against the community plugin rules that a script can check, before a release.
 *
 *   node scripts/check-guidelines.mjs                 checks the repository as it is
 *   node scripts/check-guidelines.mjs --built         also requires main.js and styles.css (after a build)
 *   node scripts/check-guidelines.mjs --tag 1.0.0     also requires the release tag to match the manifest
 *
 * It exits with 1 when anything is an error, and 0 otherwise (warnings never fail it). It does not
 * replace reading the guidelines (https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) or
 * trying the plugin in a clean vault: it only catches what a pattern can catch.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const wantBuilt = args.includes("--built");
const tagIndex = args.indexOf("--tag");
const tag = tagIndex === -1 ? null : (args[tagIndex + 1] ?? "");

const errors = [];
const warnings = [];
const notes = [];
const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const note = (message) => notes.push(message);

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (cause) {
    error(`${file} is missing or is not valid JSON (${cause.message}).`);
    return null;
  }
};

const SEMVER = /^\d+\.\d+\.\d+$/;

// ---- manifest.json
const manifest = readJson("manifest.json");
if (manifest) {
  for (const field of ["id", "name", "version", "minAppVersion", "description", "author", "isDesktopOnly"]) {
    if (manifest[field] === undefined || manifest[field] === "") error(`manifest.json: "${field}" is missing.`);
  }
  if (typeof manifest.id === "string") {
    if (!/^[a-z0-9-]+$/.test(manifest.id)) error(`manifest.json: the id "${manifest.id}" must be lowercase letters, numbers and dashes.`);
    if (manifest.id.includes("obsidian")) error(`manifest.json: the id "${manifest.id}" must not contain "obsidian".`);
  }
  if (typeof manifest.name === "string" && /obsidian/i.test(manifest.name)) {
    warn(`manifest.json: the name "${manifest.name}" mentions Obsidian.`);
  }
  if (typeof manifest.version === "string" && !SEMVER.test(manifest.version)) {
    error(`manifest.json: the version "${manifest.version}" must be x.y.z (for example 1.0.0), with no "v" and no suffix.`);
  }
  if (typeof manifest.minAppVersion === "string" && !SEMVER.test(manifest.minAppVersion)) {
    error(`manifest.json: minAppVersion "${manifest.minAppVersion}" must be x.y.z.`);
  }
  if (typeof manifest.description === "string") {
    const d = manifest.description;
    if (d.length > 250) error(`manifest.json: the description is ${d.length} characters; keep it to 250 or fewer.`);
    if (!/^[A-Z]/.test(d)) warn("manifest.json: the description should start with a capital letter.");
    if (!/[.!?]$/.test(d)) warn("manifest.json: the description should end with a full stop.");
    if (/\bobsidian\b/i.test(d) || /\bplugin\b/i.test(d)) warn('manifest.json: the description should not say "Obsidian" or "plugin".');
  }
  if (typeof manifest.author === "string" && /^(your name|author|anonymous)?$/i.test(manifest.author.trim())) {
    error(`manifest.json: the author is still a placeholder ("${manifest.author}"). Put your real name.`);
  }
  if (typeof manifest.isDesktopOnly !== "boolean") error('manifest.json: "isDesktopOnly" must be true or false.');
}

// ---- package.json and versions.json agree with the manifest
const pkg = readJson("package.json");
const versions = readJson("versions.json");
if (manifest && pkg && pkg.version !== manifest.version) {
  error(`package.json version ${pkg.version} does not match manifest.json version ${manifest.version}.`);
}
if (manifest && versions) {
  if (versions[manifest.version] === undefined) {
    error(`versions.json has no entry for ${manifest.version}.`);
  } else if (versions[manifest.version] !== manifest.minAppVersion) {
    error(`versions.json maps ${manifest.version} to ${versions[manifest.version]}, but minAppVersion is ${manifest.minAppVersion}.`);
  }
}
if (pkg && manifest && pkg.name !== manifest.id) warn(`package.json name "${pkg.name}" differs from the plugin id "${manifest.id}".`);

// ---- files
for (const file of ["README.md", "LICENSE", "manifest.json"]) {
  if (!existsSync(file)) error(`${file} is missing from the repository root.`);
}
if (existsSync("LICENSE") && /Your name/.test(readFileSync("LICENSE", "utf8"))) {
  error('LICENSE still says "Your name". Put your real name.');
}
for (const file of ["main.js", "styles.css"]) {
  if (!existsSync(file)) (wantBuilt ? error : note)(`${file} has not been built yet (run npm run build).`);
}

// ---- the release tag
if (tag !== null) {
  if (tag === "") error("--tag needs a value.");
  else if (manifest && tag !== manifest.version) {
    error(`The tag "${tag}" does not match manifest.json version "${manifest.version}". It must match exactly, with no "v" prefix.`);
  }
}

// ---- the source
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|svelte)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(path);
  }
  return out;
}
const files = existsSync("src") ? walk("src") : [];
const rules = [
  { re: /\.(innerHTML|outerHTML)\b|insertAdjacentHTML/, level: error, text: "unsafe HTML insertion (use createEl, createDiv or textContent)" },
  { re: /\b(fetch|requestUrl)\s*\(|XMLHttpRequest|new\s+WebSocket|sendBeacon/, level: error, text: "a network call (none is allowed without clearly disclosing it in the README)" },
  { re: /\beval\s*\(|new\s+Function\s*\(/, level: error, text: "dynamic code execution" },
  { re: /\bwindow\.app\b|\bglobalThis\.app\b/, level: error, text: "the global app (use this.app)" },
  { re: /hotkeys\s*:/, level: error, text: "a default hotkey on a command" },
  { re: /console\.(log|debug|info)\s*\(/, level: error, text: "debug logging to the console" },
  { re: /\b(TODO|FIXME|XXX)\b|Sample ?Plugin|MyPlugin|sample-plugin/, raw: true, level: warn, text: "a leftover marker or sample-plugin name" },
  { re: /\blocalStorage\b/, level: warn, text: "localStorage (use app.loadLocalStorage and saveLocalStorage)" },
  { re: /\.style\.[a-zA-Z]+\s*=/, level: warn, text: "an inline style (use a CSS class or setCssProps)" },
  { re: /\bactiveLeaf\b/, level: warn, text: "workspace.activeLeaf (use getActiveViewOfType)" },
  { re: /\bvar\s+[a-zA-Z_$]/, level: warn, text: "var (use const or let)" },
];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
    for (const rule of rules) {
      if (rule.re.test(rule.raw ? line : code)) rule.level(`${relative(".", file).replace(/\\/g, "/")}:${index + 1}: ${rule.text}.`);
    }
  });
}
if (manifest && manifest.isDesktopOnly === false) {
  for (const file of files) {
    if (/from\s+["'](electron|fs|path|os|child_process)["']|require\(["'](electron|fs|path|os)["']\)/.test(readFileSync(file, "utf8"))) {
      error(`${relative(".", file).replace(/\\/g, "/")}: uses a Node or Electron module but isDesktopOnly is false.`);
    }
  }
}

// ---- the APIs used against minAppVersion (only what the typings can tell: top-level imports)
const typingsPath = join("node_modules", "obsidian", "obsidian.d.ts");
if (manifest && existsSync(typingsPath)) {
  const typings = readFileSync(typingsPath, "utf8").split(/\r?\n/);
  const compare = (a, b) => {
    const [x, y] = [a, b].map((v) => v.split(".").map(Number));
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  };
  const imported = new Set();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']obsidian["']/g)) {
      for (const part of match[1].split(",")) {
        const name = part.replace(/^\s*type\s+/, "").trim().split(/\s+as\s+/)[0];
        if (name) imported.add(name);
      }
    }
  }
  for (const name of imported) {
    const at = typings.findIndex((line) => new RegExp(`^export (declare )?(abstract )?(class|function|interface|type|const|enum) ${name}\\b`).test(line));
    if (at === -1) continue;
    for (let up = at - 1; up >= Math.max(0, at - 14); up--) {
      const since = typings[up].match(/@since\s+(\d+\.\d+\.\d+)/);
      if (since) {
        if (compare(since[1], manifest.minAppVersion) > 0) {
          error(`${name} needs Obsidian ${since[1]}, but minAppVersion is ${manifest.minAppVersion}.`);
        }
        break;
      }
      if (/^\s*\*\/\s*$/.test(typings[up]) === false && /^export /.test(typings[up])) break;
    }
  }
  note(`Checked ${imported.size} imports from "obsidian" against minAppVersion ${manifest.minAppVersion}. Members used (for example getFileByPath) are not checked: try the plugin on the oldest Obsidian you claim to support.`);
}

// ---- report
const show = (symbol, list) => list.forEach((message) => console.log(`${symbol} ${message}`));
show("ERROR  ", errors);
show("warning", warnings);
show("note   ", notes);
console.log(
  errors.length === 0
    ? `\nNo errors${warnings.length ? ` (${warnings.length} warning${warnings.length === 1 ? "" : "s"})` : ""}.`
    : `\n${errors.length} error${errors.length === 1 ? "" : "s"}${warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : ""}.`,
);
process.exit(errors.length === 0 ? 0 : 1);
