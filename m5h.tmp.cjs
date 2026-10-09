const fs = require("fs");
const rep = (f, a, b, all = false) => {
  const s = fs.readFileSync(f, "utf8");
  if (!s.includes(a)) throw new Error(f + ": " + a.slice(0, 70));
  fs.writeFileSync(f, all ? s.split(a).join(b) : s.replace(a, () => b));
};
const NOTE = "-- setDestructive needs Obsidian 1.13, but this plugin supports older versions";

// Preview
rep("src/settings/Preview.ts", 'row.createEl("span", { cls: "island-card-badge", text: "1·3" });', 'row.createSpan({ cls: "island-card-badge", text: "1·3" });');

// setWarning
rep("src/settings/modals.ts", "        if (this.options.warning) button.setWarning();", `        // eslint-disable-next-line @typescript-eslint/no-deprecated ${NOTE}\n        if (this.options.warning) button.setWarning();`);
rep("src/settings/tabs.ts", "        .setWarning()\n", `        // eslint-disable-next-line @typescript-eslint/no-deprecated ${NOTE}\n        .setWarning()\n`);

// store.ts: window timers
rep("src/settings/store.ts", "  private timer: ReturnType<typeof setTimeout> | null = null;", "  private timer: number | null = null;");
rep("src/settings/store.ts", "    if (this.timer !== null) clearTimeout(this.timer);\n    this.timer = setTimeout(() => {", "    if (this.timer !== null) window.clearTimeout(this.timer);\n    this.timer = window.setTimeout(() => {");
rep("src/settings/store.ts", "    if (this.timer !== null) {\n      clearTimeout(this.timer);", "    if (this.timer !== null) {\n      window.clearTimeout(this.timer);");
rep("src/settings/store.test.ts", "  beforeEach(() => {\n    vi.useFakeTimers();", "  beforeEach(() => {\n    // The store uses window timers so it works in popout windows; point window at the test timers.\n    vi.stubGlobal(\"window\", globalThis);\n    vi.useFakeTimers();");
rep("src/settings/store.test.ts", "  afterEach(() => {\n    vi.useRealTimers();", "  afterEach(() => {\n    vi.useRealTimers();\n    vi.unstubAllGlobals();");
rep("src/settings/store.test.ts", "const save = vi.fn();\n    const store = new SettingsStore(DEFAULT_SETTINGS, save, 300);\n    for (", "const save = vi.fn<(settings: IslandTreeSettings) => void>();\n    const store = new SettingsStore(DEFAULT_SETTINGS, save, 300);\n    for (");
rep("src/settings/store.test.ts", 'import { DEFAULT_SETTINGS, findField, withFieldValue } from "./schema";', 'import { DEFAULT_SETTINGS, findField, withFieldValue, type IslandTreeSettings } from "./schema";');

// validate.ts control characters
rep("src/settings/validate.ts", 'const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;', `/** Replaces control characters (including line breaks) with spaces. */
function withoutControlCharacters(text: string): string {
  return Array.from(text, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127 ? " " : character;
  }).join("");
}`);
rep("src/settings/validate.ts", "const cleaned = value.replace(CONTROL_CHARACTERS, \" \").trim();", "const cleaned = withoutControlCharacters(value).trim();");
rep("src/settings/validate.ts", 'return name.replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim().slice(0, PRESET_NAME_MAX);', 'return withoutControlCharacters(name).replace(/\s+/g, " ").trim().slice(0, PRESET_NAME_MAX);');
rep("src/settings/validate.test.ts", "const hostile = JSON.parse(", "const hostile: unknown = JSON.parse(");
