# Decisions

Significant choices, newest last. Each entry says what was decided, why, and when it might be revisited. Decisions already agreed in `SPEC.md` section 2 are not repeated here.

## D-001: Svelte 5 with esbuild-svelte (milestone 1)

**Decision:** Build Svelte components with `esbuild-svelte`, using Svelte 5 and its built-in TypeScript support, so no preprocessor is needed. Mount with `mount` and `unmount` from `svelte`. CSS is injected into `main.js`.

**Why:** It keeps one bundler, as `SPEC.md` requires, and avoids a second config for TypeScript in components.

**Revisit if:** a component needs TypeScript syntax that Svelte's built-in stripping does not handle.

## D-002: Vitest for unit tests (milestone 1)

**Decision:** Use Vitest in a plain Node environment, testing pure modules only.

**Why:** `SPEC.md` keeps layout and model code free of UI imports so it can be tested without Obsidian. Vitest runs TypeScript with no extra setup. Config is `vitest.config.mts` so it loads as an ES module without a Node warning.

## D-003: Minimum Obsidian version 1.7.2 (milestone 1)

**Decision:** `minAppVersion` is `1.7.2`.

**Why:** The lint rule `obsidianmd/no-unsupported-api` flagged `Workspace.revealLeaf` as needing 1.7.2. It is the newest API used so far. Raise it only when a later milestone needs a newer API.

## D-004: View type, id and icon (milestone 1)

**Decision:** Plugin id `island-tree`, view type `island-tree-view`, icon `network` (Lucide).

**Why:** The id has no "obsidian" in it, as the community guidelines require. The id is still marked "to be confirmed" in `SPEC.md` section 13; changing it later means changing `manifest.json`, the plugin folder name and saved data.

## D-005: Typed settings with a version field (milestone 1)

**Decision:** One `IslandTreeSettings` object with `version`, merged over `DEFAULT_SETTINGS` on load. Numeric values will pass through `clampNumber`.

**Why:** `SPEC.md` section 9 requires defaults, ranges and a migration path. The version field is added now so later milestones can migrate without guessing which schema saved data uses.

## D-006: Command and ribbon names omit the plugin name (milestone 1)

**Decision:** Commands are "Open dashboard" and "Open dashboard in sidebar", and the ribbon tooltip is "Open dashboard". `SPEC.md` section 7 said "Open Island tree".

**Why:** Obsidian shows the plugin name beside each command already, and the lint rules `obsidianmd/commands/no-plugin-name-in-command-name` and `obsidianmd/ui/sentence-case` flag the original names. Following them keeps the plugin submission-ready.

## D-007: Settings tab uses the classic `display()` API for now (milestone 1)

**Decision:** The empty settings tab implements `display()` only. The lint rule `obsidianmd/settings-tab/prefer-setting-definitions` warns that the declarative `getSettingDefinitions()` (Obsidian 1.13+) is preferred so settings appear in search.

**Why:** Our minimum version is 1.7.2, and the full settings page needs a custom horizontal tab strip and a live preview, which the declarative API may not support. Decide in milestone 5 after reading the current docs for that API.

**Revisit:** milestone 5.

## D-008: Dev dependency audit findings accepted (milestone 1)

**Decision:** `npm audit` reports 3 moderate findings, all via `moment` inside the `obsidian` typings package. Not fixed.

**Why:** The suggested fix downgrades `obsidian` to 0.14.5, which is far too old. The packages are development-only and are not bundled into `main.js`.
