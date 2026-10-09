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

**Settled in milestone 5:** see D-026.

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

## D-015: Search is a temporary overlay, not saved state (milestone 3)

**Decision:** Typing in the search box does not change `open`, `showAll` or `filesFor`. `withSearchReveal` adds the folders leading to each match on top of them while the query is non-empty, and clearing the query restores the view as it was. Matching is a case-insensitive substring of the name. Typing also leaves any focus, as the mockup does.

**Why:** The mockup left every folder it had opened during a search open afterwards, which is hard to undo. The overlay keeps SPEC.md section 4 rule 7 (matches highlight, ancestors open, parent folders list files, other cards fade) without the side effect.

**Cost:** while a search is active, closing a folder on the way to a match has no effect.

## D-016: The camera re-fits on layout, focus and reset only (milestone 3)

**Decision:** `fitKey` in `App.svelte` is bumped when the layout changes, the focus changes (including Reset focus and the breadcrumb) and on Reset. `FitController.svelte` then frames the target positions with `getViewportForBounds` and `setViewport`. Folder clicks, the Expand toggles and search do not move the camera.

**Why:** Re-fitting on every change makes the view jump while browsing. The camera frames where cards are going, not where they are, because they are still gliding when it moves (`layout/bounds.ts`). It sits in a child component because only descendants of `<SvelteFlow>` can reach the viewport.

## D-017: Radial layout constants and a layout dispatcher (milestone 3)

**Decision:** `layout/layout.ts` chooses the engine for the current mode and holds the card sizes: 116×40 for vertical, 88×30 for radial (both from the mockup). Ring radii are 0, 125, 235, 335, 425 then +90 per further ring, as in the mockup. Radial cards use a smaller font and padding (`island-card-compact`).

**Why:** One place decides the engine and the sizes. They stay constants until the settings milestone. The mockup's detailed-card scale of 1.3 is supported by `layoutRadial` (`scale`) but not used until detailed cards exist in milestone 4.

## D-018: Double click focuses folders and opens files (milestone 3)

**Decision:** A double click on a folder focuses it. A double click on a file opens it in a new tab, or in a split with Ctrl or Cmd, through `workspace.getLeaf("tab" | "split")` and `leaf.openFile`. The file is found with `vault.getFileByPath`; if it has gone, a short Obsidian notice says so (the in-view toast arrives in milestone 6). The two single clicks that precede a double click toggle a folder twice, which cancels out.

**Why:** SPEC.md section 2 defines these gestures, and the dashboard is of little use if files cannot be opened. Svelte Flow has no node double click event, so the card element handles it.

## D-019: Radial branches and the centre handle (milestone 3)

**Decision:** The radial centre travels in each edge's data. `radialBranchPath` places both control points on the mid radius, one at the parent's angle and one at the child's. A parent on the centre has no angle of its own, so it uses the child's. Centre handles (D-012) work for both layouts unchanged.

**Why:** It follows SPEC.md section 5. Using the target centre means branches look slightly off for the fraction of a second a layout switch takes to glide; acceptable for now.

## D-020: Live updates rebuild the whole tree with stable ids (milestone 4)

**Decision:** When files are created, deleted or moved, `App.svelte` rebuilds the full node tree from the vault, reusing the same `UidRegistry` so every path keeps its id. A rename or move is reported to the registry (`moved`) at once, before the debounced rebuild, so the card keeps its id and glides to its new parent. `reconcileViewState` then removes ids that no longer exist. SPEC.md section 7 prefers incremental updates and lazy building of collapsed folders; both are deferred.

**Why:** Patching the tree adds a lot of risk (renames, moves, folder renames, ordering) for no visible gain on normal vaults, and the rebuild is a single pass over the vault. The 10,000-file test in milestone 7 will measure it, and incremental or lazy building can then be added with a measured target.

**Revisit if:** the rebuild takes noticeably long on a large vault, or typing in a note causes a visible stall (modify events do not rebuild the tree, only re-read details).

## D-021: Notifications wait for quiet and arrive once (milestone 4)

**Decision:** `watch.ts` debounces structure events (`create`, `delete`, `rename`) and metadata events (`modify`, `changed`, `resolved`) separately, each after 150 ms with no new event. Renames also call `onRename` immediately. The returned function removes every listener and cancels pending calls, and the app calls it when the view closes.

**Why:** Editing a note fires `modify` and `changed` many times a second. A smoke test with 200 events two milliseconds apart produced one update after the burst ended. Rename identity must be recorded before the rebuild, or the card would vanish and reappear.

## D-022: File details are read for visible cards only (milestone 4)

**Decision:** `MetaReader` reads modified time, size, links, tags and status when a card is built or the info panel needs it, never for the whole vault. The link index (outgoing and incoming counts, inverted once from `resolvedLinks`) is cached until a change makes it stale. A "link" counts a distinct linked note, not each mention; a card shows outgoing plus incoming, and the info panel shows both.

**Why:** A vault with thousands of notes should cost nothing for notes nobody is looking at. Counting distinct notes avoids one note linking the same page ten times inflating the figure. SPEC.md says not to use undocumented backlink helpers, so backlinks come from inverting `resolvedLinks`.

## D-023: Status property, chip colours and recency (milestone 4)

**Decision:** The status comes from the frontmatter property named by the `statusProperty` setting (default `status`; a settings control arrives in milestone 5). It accepts a string, a number or the first item of a list. `done` is green, `review` is blue and any other value is amber, as in the mockup; a file without a status shows no chip. The recency dot is green for edited today, amber within 7 days and grey after that, counted in calendar days.

**Why:** Matches the mockup. Statuses are free text, so unknown values need a neutral but visible colour.

## D-024: Details toggle, card sizes and semantic zoom (milestone 4)

**Decision:** A Details toggle switches to bigger cards (168×58 vertical, 132×48 radial, rings spread by 1.3) with a second row. The row shows only when the camera zoom is at least 0.7; below 0.45 every card becomes a type-coloured dot and a short name; between the two it is the normal single row. The camera re-frames when Details is toggled, because card sizes change. The zoom level lives in shared reactive state (`ZoomState`), not in the node data, so zooming does not rebuild every card.

**Why:** SPEC.md section 6. The thresholds are constants until the settings milestone.

## D-025: What happens to selection and focus when files disappear (milestone 4)

**Decision:** If the selected card is deleted the selection clears. If the focused folder is deleted the view returns to the vault root. While Expand folders is on, folders created later are opened, but a folder the user closed by hand stays closed.

**Why:** A stale selection or focus would leave the view pointing at nothing. Manual clicks win over the toggle (SPEC.md section 4 rule 6), which is why only folders that did not exist before are opened.

## D-026: Classic settings API with a custom tab strip (milestone 5)

**Decision:** The settings page implements `display()` and builds its own header, live preview and tab strip from `Setting` rows. It does not implement the declarative `getSettingDefinitions()`. This settles D-007. The lint warning `obsidianmd/settings-tab/prefer-setting-definitions` stays and is accepted.

**Why:** The declarative API needs Obsidian 1.13 or later, while the plugin supports 1.7.2. A custom tab strip and a live preview are what `SPEC.md` section 9 asks for and do not fit a list of definitions.

**Cost:** on Obsidian 1.13 and later these settings do not appear in the global settings search. Adding `getSettingDefinitions()` later, for newer versions only, would fix that without removing this page.

## D-027: One schema table drives settings, validation, controls, presets and import (milestone 5)

**Decision:** `settings/schema.ts` lists every setting once. Validation, defaults, the controls, presets, reset and export are generated from it. Saved data is nested by group (`cards`, `lines`, `canvas`, `layout`, `editing`) with a `presets` list, schema version 2. Version 1 data (flat `defaultLayout` and `statusProperty`) is migrated on load.

**Why:** Adding a setting means adding one entry, and the page, validation and import cannot disagree. Everything that touches untrusted data goes through one function, `coerceField`.

## D-028: Theme-following defaults (milestone 5)

**Decision:** An empty colour setting means "follow the theme" (the accent for the highlight, a border colour for the grid), and a text size of 0 means the Obsidian interface size. Colours must be hex (`#rgb`, `#rrggbb` or `#rrggbbaa`); anything else is rejected, so a setting can never inject other CSS.

**Why:** `SPEC.md` section 9 says defaults point at Obsidian theme variables. Hex-only values come straight from the colour picker and are safe to put in a CSS variable.

## D-029: Card sizes and ring radii derived from one value each (milestone 5)

**Decision:** The settings give one card width and height. The detailed and radial sizes are derived with the mockup's ratios, and the ring radii are multiples of the first ring's radius (1, 1.88, 2.68 and 3.4 times). At the defaults the results equal the mockup's numbers exactly.

**Why:** Four independent sizes and five ring radii would be too many controls, and keeping the proportions means cards never overlap when you resize them. Rounding makes some sizes differ by a pixel from a hand-picked value.

## D-030: What a preset contains (milestone 5)

**Decision:** A preset stores every Cards, Lines and grid and Layout setting except the status property name, which belongs to the person's notes, not the look. The Editing settings are never part of a preset. Applying a preset first returns the whole look to its defaults, then sets the preset's values. The built-ins are Compact, Comfortable (the defaults) and Large. A name must be 1 to 40 characters, unique ignoring case, and not a built-in's. At most 30 presets are kept.

**Why:** Applying a look should not change how the dashboard behaves or which property is read. Resetting first makes a built-in that sets only a few values give the same result every time.

## D-031: Import is untrusted input (milestone 5)

**Decision:** An imported file must be at most 1,000,000 characters, valid JSON, labelled `island-tree-settings` and not from a newer settings version. Every value then goes through the same checks as saved data. Unknown keys are ignored, out-of-range numbers are adjusted, wrong types and unknown options fall back to the default, and a summary says which. Nothing changes until the person presses Apply. Imported presets are added; one whose name is already used is skipped.

**Why:** `SPEC.md` section 9 says never to trust imported data. Showing the summary first means a wrong file does not silently change the look.

## D-032: Saving is delayed and flushed on unload; settings apply live (milestone 5)

**Decision:** `SettingsStore` tells subscribers immediately, saves 300 ms after the last change, and saves any pending change when the plugin unloads. Open dashboards subscribe, so colours, line style and similar changes apply at once. Changes to card size or spacing also animate the cards and re-frame the camera, and a new status property name makes cards read their details again. The settings page redraws only the preview on a change, not the controls, so a slider is not interrupted while being dragged.

**Why:** A slider fires many changes a second and each save writes a file. The live link makes the page worth using.

## D-033: Warning style by class, not by the new method (milestone 5)

**Decision:** Destructive buttons get the `mod-warning` class directly. The methods for it are deprecated (`setWarning`) or need Obsidian 1.13 (`setDestructive`), and the lint rules forbid disabling the deprecation check.

**Why:** It works on every supported version and keeps the lint clean.
