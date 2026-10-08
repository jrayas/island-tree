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

## D-009: One built stylesheet, bundled by esbuild (milestone 2)

**Decision:** The stylesheet source is `src/styles.css`, which imports `@xyflow/svelte/dist/style.css`. esbuild bundles it into the root `styles.css`, which is generated and git-ignored. Component `<style>` blocks are not used.

**Why:** Obsidian loads only `styles.css`, and the lint rule `obsidianmd/no-forbidden-elements` forbids creating `<style>` elements at runtime, which was the first approach tried. Bundling keeps Svelte Flow's CSS in step with its version and ships one file in the release.

**Consequence:** `styles.css` does not exist in a fresh clone until the first build. The release workflow (milestone 7) must build before attaching it.

## D-010: Cards glide through JavaScript, not CSS transitions (milestone 2)

**Decision:** `Canvas.svelte` steps card positions every animation frame (`layout/animate.ts`) and rebuilds the Svelte Flow nodes, instead of letting CSS transition the node transforms. This replaces the CSS-transition approach in the milestone 2 plan.

**Why:** Svelte Flow draws a branch from the nodes' positions in its store. A CSS transition moves only what is on screen, so branches would jump to the end state and detach while cards glide. Stepping the positions keeps every branch attached, as `SPEC.md` section 5 requires.

**Cost:** nodes are rebuilt each frame while something moves. Fine for hundreds of cards; revisit with the large-vault test in milestone 7. The loop stops once all cards settle.

## D-011: Card data is plain; callbacks go through context (milestone 2)

**Decision:** Node `data` holds only plain values. The badge callback reaches cards through Svelte context (`ui/context.ts`).

**Why:** Svelte Flow tests the first node with `structuredClone` to detect deeply reactive state, and a function in the data makes that fail, logging a misleading "Use $state.raw" warning on every render.

## D-012: Handles at the card centre, branches drawn centre to centre (milestone 2)

**Decision:** Each card has one invisible one-pixel target handle and one source handle, both at its centre. `BranchEdge` curves between those points, and cards sit above branches.

**Why:** It works the same for the vertical and radial layouts (milestone 3) without moving handles, and the curve visually starts at the card edge because the card covers its end.

## D-013: Click behaviour follows the mockup (milestone 2)

**Decision:** Clicking a folder opens or closes it and selects it. Clicking a file selects it. `SPEC.md` section 2 says "single click selects" and section 4 rule 6 says manual clicks win; this combines them as the mockup does.

**Revisit if:** accidental collapsing while selecting proves annoying; a separate chevron or the double click could take over opening.

## D-014: Tree read in full on open; sizes are constants (milestone 2)

**Decision:** `readVault` walks the whole vault each time the view opens, and card size and gaps are constants in `App.svelte`.

**Why:** Lazy building and live updates are milestone 4, and the settings that control sizes are milestone 5. The visible tree is small even for large vaults because folders start closed, but the full walk is the first thing to measure in the milestone 7 performance test.
