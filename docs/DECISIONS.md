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

## D-034: One surface: graph in Canvas's colour, details floating over it (after milestone 5)

**Decision:** The graph and the selection text share a `.island-stage` that fills the view below the breadcrumb. `.svelte-flow` and its background are painted `--background-primary`, the grid default is `--background-modifier-border`, and the details are absolutely positioned text with no box, `pointer-events: none` and a fade. The text sits to the right of the zoom buttons (left 56px) because Svelte Flow's controls already occupy the bottom left corner. Its third line joins a file's details with " · ". The grid colour setting still overrides the dot colour, so the dots are set in CSS rather than through the Background component's colour props.

**Why:** A requested UI change: the graph must read as one continuous surface like Obsidian's own Canvas, with no permanent strip taking layout space. Obsidian's Canvas uses its own variables (`--canvas-background`, `--canvas-dot-pattern`), which default to the same values as the ones used here in the default theme; I could not check a theme that overrides them from here, so `docs/DEVELOPMENT.md` says how to compare and which two lines to change.

## D-035: Bottom area layout (after milestone 5)

**Decision:** The selection text is at the bottom right (`right: 16px; bottom: 48px`, right-aligned, width capped so its left edge stays 64px from the pane edge). The zoom buttons stay at the bottom left, 8px apart, each with its own outline, 18px from the left and 45px from the bottom. The credit was first moved to the bottom left with `attributionPosition`; D-036 then removed it.

**Why:** A requested change: the text read like a label on the fit button, and the credit and Obsidian's status bar crowded the bottom right. Both bottom-left items are Svelte Flow panels placed by fixed offsets from the bottom edge, so they cannot overlap at any pane size. The status bar's exact height depends on the theme, so 48px is an estimate to check by eye.

## D-036: Evenly inset bottom area; Svelte Flow credit hidden (after milestone 5)

**Decision:** `.island-stage` defines `--island-edge-gap: 24px`. The zoom buttons (left, bottom) and the details text (right, bottom) use it, so all three edges are inset equally and the last line of the text and the fit button share a bottom line. The text's name and path are clamped to two lines with an ellipsis. The on-screen Svelte Flow credit is hidden with `proOptions={{ hideAttribution: true }}` (the prop exists unchanged in the installed version) and credited in the README. The breadcrumb uses `--font-interface`.

**Why:** A requested change: the bottom items did not share a baseline and the credit pushed the buttons up. Svelte Flow is MIT licensed, so hiding the label is allowed; its typings ask users who hide it to consider a Pro subscription, which is the owner's call. Obsidian normally ends the pane above the status bar, so 24px is enough in the standard layout; a theme that floats the status bar over the pane may need a larger value, which is why it is one variable. The path is clamped at its end, so a very long path loses its tail, not its start; showing the end instead would need a direction trick that breaks right alignment.

## D-037: Beat Obsidian's view padding; measure the status bar (after milestone 5)

**Decision:** The root rule is `.workspace-leaf-content .view-content.island-tree-view { padding: 0 }`. Obsidian's own rule `.workspace-leaf-content .view-content` has two classes and sets `padding: 12px 12px 32px`, so the old one-class rule lost. The floating elements use `--island-bottom`, which is `max(--island-edge-gap, --island-clear)`. `view.ts` measures Obsidian's `.status-bar` (a floating, fixed element in the default theme) with a `ResizeObserver`, the window `resize` event and `layout-change`, and `statusBarClearance` (pure, tested) turns the two rectangles into `--island-clear`: 0 unless the bar covers the view's bottom-right, otherwise its height plus 4px.

**Why:** The extra gap was Obsidian's 32px bottom padding stacking with the 24px gap (and 12px at the sides). Nothing in this plugin's own CSS stacked, which was checked in a browser against Obsidian's real stylesheet. A fixed lift for the status bar would remain when the bar is hidden, so it is measured instead. The `.status-bar` class is not part of the plugin API; if it is missing, no lift is applied.

## D-038: Zoom stack on the left edge, details text bottom left (after milestone 5)

**Decision:** The zoom controls are placed at the top left by Svelte Flow, then turned into a flex column inside a box that is symmetric around `--island-zoom-offset-y` (default 45% of the graph's height) and clamped to stay inside the graph. The buttons are centred in that box with `justify-content: safe center`, so the stack stays centred when a button is added and, in a very short pane, starts at the top inset instead of spilling out. The box ignores the pointer; only the buttons take clicks. Svelte Flow's `top`, `bottom` and 15px margin are overridden with one extra class. The details text is bottom left, left-aligned, in a bottom-anchored flex column whose `max-height` stops it one gap short of the stack (`--island-zoom-half` is half the stack's height, 47px for three buttons; update it if a button is added). When there is not enough room the top of the name is cut first. `statusBarClearance` now takes the text's sideways extent: the text lifts above the status bar only if the bar reaches it, and the buttons no longer move for the bar at all.

**Why:** A requested layout change. Moving the stack off the bottom removed the shared baseline (D-036) and the need to lift it for the status bar. Percentages inside custom properties are only resolved where they are used, so the same `--island-zoom-offset-y` serves `top`, `height` and the text's `max-height`. In a pane shorter than about 140px the stack and text cannot both fit; the text shrinks to nothing first.

## D-039: Zoom to area is an overlay layer, not Svelte Flow's selection box (after milestone 5)

**Decision:** A transparent layer over the graph (`BoxZoom.svelte`) takes the drag while box mode is on (the fourth zoom button) or Shift is held. It draws its own rectangle, so Svelte Flow's Shift-drag selection box, which this dashboard keeps off (`elementsSelectable` is false), is never involved. While the layer is armed the pane cannot receive the drag, and `panOnDrag` is also switched off in box mode. Drags under 20px are ignored and leave box mode on so you can try again; Escape or a successful zoom turns it off. The camera comes from `cameraForRect` (8% padding, zoom between 0.2 and 1.5), not the library's helper, so the cap is ours and tested. Shift is tracked on the window and ignored while typing in an input.

**Why:** Shift-drag selection would have needed selection turned on for the whole graph. One overlay gives the same behaviour in every layout, and a click on the button and the Shift shortcut share one code path. Ctrl and Cmd are avoided because Obsidian uses them. Wheel zoom over the layer is not forwarded while it is armed; the zoom buttons stay above it. A harness note: this was checked in headless Chrome with real mouse and key events against Obsidian's stylesheet; the first version of that harness lacked Obsidian's `HTMLElement.empty()`, which made Svelte skip its effects and wrongly suggested that branches and the first fit were broken.

## D-040: Mind map layout (after milestone 5)

**Decision:** `LayoutMode` gains `mindmap`, with two views, `balanced` and `oneSided`, stored in a new setting `layout.mindMapView` (not part of presets) that the toolbar's Mind map button writes, so it is remembered. The first click selects the layout; later clicks while it is on cycle the views. Balanced keeps the root's branches in order and chooses the split point that makes the two sides closest in total stacked height (ties give the right side the extra branch); the right side reads top to bottom and the left continues from the bottom up (clockwise). Cards keep the plain vertical size; rows use `gap` and columns are twice `levelGap` apart. Branches use new edge paths from the parent's nearest card edge to the child's nearest card edge, computed from the card centres and the child's side (the invisible centre handles are unchanged): an S-curve, or rounded elbows for the Step style, and "straight" is drawn as the S-curve so there is never a diagonal. The branch keeps the same flowing dashed line as the other layouts (first made solid, then changed back at the owner's request, who prefers the live dotted line), so the dash and flow-speed settings apply. The balanced layout returns a `frame` mirrored about the root, which the camera frames instead of the card bounds, so the root stays in the middle of the view when one side is shallower. Fit padding is unchanged (the existing number 0.2 works out to about 8% of the pane on each side).

**Why:** A requested feature. The order-preserving split is predictable and keeps sibling order; a greedy split by size would balance slightly better but scramble the order (this was offered and the order-preserving one chosen as the default). Elbows and curves share the existing curve-style setting instead of adding a second one. Leaves stay in their own level's column in the one-sided view; stretching shallow leaves to the last column would give long connectors across empty columns.

## D-041: Editing (milestone 6)

**Decision:** The app is locked until the person unlocks it, from a toolbar button or the Toggle lock command (offered only while the dashboard is the active view, reaching the app through a `LockBridge`). An interval checks every ten seconds whether the idle time has passed and locks again with a notice. The UI depends only on `EditingApi`; `EditingController` implements it with `fileManager.renameFile` (rename and move), `fileManager.trashFile` (delete), `vault.create`, `vault.createFolder`, and `vault.readBinary` and `vault.createBinary` (to bring a deleted single file back). Every edit checks the rules in `editing/rules.ts` first and never throws. A rename or new-note dialog reuses the settings page's text dialog. Dragging is done by the canvas, not Svelte Flow: the card stays where the layout put it, a ghost follows the pointer, and the card under the pointer is found with `elementFromPoint`, so it works the same in all three layouts. Cards that can be dragged carry Svelte Flow's `nopan` class so the pane does not pan underneath, and the click that follows a drag is ignored. Undo: rename and move are reversed by renaming back, but only if the item is still where it was left and the old name is free; a create is reversed only while the note is still empty (or the folder still has nothing in it); a deleted single note is recreated from its content kept in memory (up to 20 MB); a deleted folder says to use Obsidian's trash. Each entry can be used once, and the list holds the last 20. A new note or folder is selected as soon as its card exists, and its folder is opened with its "+N more" list shown so it is not hidden. The delete confirmation follows the "Delete behaviour" setting, and a folder with more files than "Confirm folder actions above" always asks, for deleting and for moving.

**Why:** `SPEC.md` section 8. Keeping the decisions pure means the awkward cases (own descendant, clash ignoring case, trailing dots) are tested without Obsidian. Restoring a deleted note by recreating it loses its modified date and leaves the trash copy, which is the price of not depending on where Obsidian's trash is. Folder restore was left out because the trash can be the system bin. The drag highlight uses plain DOM class changes rather than reactive state, so a pointer move does not rebuild every node.

## D-042: Settings page crashed in real Obsidian (found after milestone 6)

**Decision:** The preview passes SVG classes as an array. The lesson is recorded in `docs/DEVELOPMENT.md`, and the test stand-ins copy Obsidian's real `createEl` and `createSvg`.

**Why:** The first real run of the plugin (Obsidian 1.14.4) showed the settings page with a header and a half-drawn preview and nothing else. `createSvg` passes a string class straight to `classList.add`, which throws `InvalidCharacterError` on a space, so the preview threw part-way and `display()` never reached the tab strip. The jsdom and Chrome stand-ins used `setAttribute("class", …)`, which accepts spaces, so milestone 5 passed every check it had. Reproduced with the faithful stand-in, which gave one line, no cards and no tabs before the fix and the full page after it.

**Not done:** the preview is not wrapped in a try/catch. A failure there would still blank the page, but it would also hide a real bug; the console error is more useful.

## D-043: Compact density toggle

**Decision:** The toolbar has a Compact button that flips the saved setting `layout.density` (comfortable or compact). It is an overlay: `withDensity` lowers the nine size and spacing settings that the built-in Compact preset sets, and `App.svelte` and `view.ts` read the settings through it. A size is never raised (so a square corner or a small card the person chose stays), and a text size of 0 (the theme's) becomes the Compact size. Not part of presets. The Hand tool that was discussed alongside it was dropped, because dragging the background already pans.

**Why:** Applying the Compact preset would reset the whole look (colours, lines, grid) and could not be undone. An overlay keeps the person's own sizes, so one more click is always an exact way back. In a measured wide tree, Compact raised the fit zoom from 0.48 to 0.63, with text about 20% larger on screen; cards stay about the same width on screen because the tree is width-bound, so the gain is mostly readability, not bigger cards.

## D-044: Mouse like Obsidian's Canvas, and one Fit

**Decision:** Scroll pans by default and Ctrl or Cmd (or Space) and scroll zooms, with a **Mouse wheel** setting (`canvas.wheel`, pan or zoom, not part of presets) that swaps them. Left, middle and right drags pan (`panOnDrag={[0, 1, 2]}`). Space held makes cards `pointer-events: none` so a drag or scroll falls through to the pane, which is simpler and safer than fighting the cards' `nopan` class and card drag. Space and Shift and 1 only act while the pointer is over the dashboard and the key is not meant for a box, button or dialog. Left-drag on the background stays a pan, not a selection box, because there is no multi-select; Shift-drag stays Zoom to area. The stock Svelte Flow fit button is replaced by our own control button that bumps `fitKey`, so the button, Shift and 1, and the automatic fit are one code path.

**Why:** Read from Obsidian's own Canvas code (1.14.4): wheel pans by default (its option can flip to zoom), Shift and scroll pans sideways, Mod or Space and scroll zooms, Space and drag pans, middle and right drags pan, left drag selects. Measured in Chrome before the change: the wheel zoomed, a right drag did nothing and the stock fit button zoomed a small tree to 200% (our automatic fit stops at 100%), which is the over-zoom that was reported. Svelte Flow matches the character a key types, so Space is a single space, not the word Space. Its own Space pan key already turns scroll into a pan, which matches Canvas in zoom mode.

## D-045: Going back to the dashboard, and the search fade

**Decision:** A setting `layout.openNotesIn` (New tab by default, This tab, Split) decides where a plain double click opens a note; Ctrl or Cmd always opens a split. This tab calls `leaf.openFile` on the dashboard's own leaf so Obsidian's own history gives Back; in a sidebar or a pinned tab a new tab is used instead. For Back to be useful the view saves how it was left: `getState` returns a `SavedView` (by path) and `setState` hands it back, either before the app mounts (kept as `pending`, passed as `initialView`) or after (applied through the `restore` callback). `getState` is called by Obsidian when the tab navigates away, so the snapshot is always current. The app asks Obsidian to save the layout (`requestSaveLayout`, already debounced) when the view changes, so a restart restores it too. Saved state is parsed defensively (types checked, lists and text bounded, unknown layouts rejected), and paths that no longer exist are dropped. The camera re-fits rather than restoring the exact pan and zoom. A separate setting `layout.dimOnSearch` (on by default) controls the search fade; matches always keep their yellow ring (a yellow tint was tried and dropped; the ring alone was preferred).

**Why:** A note opened in a new tab starts with no history, so Back was greyed out and the way back was to find the dashboard's tab. Defaulting to New tab keeps today's behaviour and never replaces the dashboard unexpectedly. Paths, not ids, because ids are handed out afresh each session. This also answers the open question in `SPEC.md` about remembering the view between sessions.

**Not verified:** the order in which Obsidian calls `onOpen` and `setState` on Back is not documented, so both orders are handled and tested in a browser through the same bridge, but the real navigation has not been run in Obsidian.

## D-046: Card limits for big vaults

**Decision:** One folder shows at most `EXPANDED_CAP` (500) cards even when expanded, and `buildVisibleTree` stops at `MAX_CARDS` (1,000) cards in total. It fills the tree level by level (breadth first), so the top always shows and only the deepest levels are cut. Wherever children are left out a pill says how many (`capped`, which does nothing when clicked). Pills do not count towards the limit, so the count of pills is bounded by the number of cards drawn. A folder that is too big to show in full shows search matches and the folders leading to them first (`prefer`). Search runs 180 ms after typing stops, and the count of matches shows beside the box. `onlyRenderVisibleElements` was tried and left out.

**Why:** Measured on a made-up vault of 10,000 notes (`docs/PERFORMANCE.md`): the pure steps take under 50 ms, but drawing and gliding thousands of cards freezes the dashboard (10,000 cards: 5.6 s to appear, 8 frames per second; searching "note": 10,601 cards, 8.3 s). The glide rebuilds every card each frame, so the number of cards is what costs, not how many are on screen. 500 in one folder and 1,000 overall measured at 60 frames per second. A limit per folder alone was not enough, because a broad search opens many folders at once.

**Cost:** a folder with more than 500 notes cannot be browsed past the first 500 on the dashboard; searching reaches the rest. Raising the limits is a one-line change in `visibility.ts`.

## D-047: Keyboard and screen reader support

**Decision:** The canvas is one tab stop (`role="tree"`, `tabindex="0"`, `aria-activedescendant` pointing at the selected card) and each card is a `treeitem` with a label, level, selected and (for folders) expanded state. Keys follow a tree view: arrows, Home, End, Enter (`model/keyNav.ts`, pure), plus F for a folder's files. Pills are navigable and Enter expands them. The camera follows a selection that leaves the screen, at the same zoom, only when it is off screen. Editing by keyboard (F2, Delete) was left out for v1. Keys are not claimed when the target is a button, box or dialog, nor with Alt, nor with Ctrl or Cmd except Enter, so Obsidian's own shortcuts (Back is Alt and Left) keep working. The count badges are `tabindex="-1"`, because a stop on every folder would make tabbing through a big tree unusable. A general reduced-motion rule sets all animation and transition durations to nothing inside the dashboard; the card glide and camera moves check the same preference in script.

**Why:** The dashboard was mouse-only. The tree pattern is what screen reader users and Obsidian's file explorer already expect. Measured in Chrome with real key events: every key above, the focus ring on the canvas (it was missing until the stylesheet was rebuilt) and on toolbar buttons (Obsidian's own ring), and reduced motion turning the line animation and transitions off.

**Not verified:** a real screen reader. The roles and labels are checked in the DOM, not heard.

## D-048: Batch reveal for "+N more"

**Decision:** A folder lists `limit` children at first (the List limit setting, default 40 and up to 200). `ViewState.batches` maps a folder to the extra batches revealed (batch 0 is always shown), and "+N more" reveals the lowest batch not shown yet (`nextBatchFor`, `revealBatch`). A folder never shows more than `FOLDER_CEILING` (1,000); past that the card is inert ("N not shown") and a search, which puts matches first (`prefer`), is the way to the rest. A search reveals only the batches that hold a match or a folder leading to one (`searchTree` takes the batch size and returns `batches`), so unrelated siblings stay hidden. A new or moved card reveals its own batch once it exists. Saved state keeps batches by path (a state saved before this, with the old expand-all list, still loads and its list is ignored). The numbers moved to `src/model/limits.ts`; the overall budget rose from 1,000 to 1,500 and the per-folder cap from 500 to 1,000. `onlyRenderVisibleElements` was turned back on. This replaces the per-folder expand-all of D-046; the rest of D-046 stands.

**Why:** The request was for batches and a small first view of a big folder, which also makes the first view cheap (43 cards for a 10,000-note folder). Batches by position keep the order predictable. Measured at the new limits: 1,003 cards in one folder panned at 39 frames per second with every card drawn, and 60 with only the visible ones drawn, so that option earns its place now, though at 10,000 cards it did not.

**Cost:** a folder of more than 1,000 notes cannot be browsed past the first 1,000 on the dashboard; searching reaches the rest. Batches earlier than a revealed one stay hidden until asked for, so a card can show with a gap before it.

## D-049: Expand folders goes one level at a time

**Decision:** `expandLevel(state, frontier)` opens the folders that are on screen, closed, and have something to show (a subfolder, or files while files are visible). The frontier is derived in `App.svelte` from the visible tree. When the frontier is empty the button becomes **Collapse folders** and `collapseFolders` closes everything and resets the focus. `reconcileViewState` no longer opens folders created while Expand folders is on, and the start setting opens the vault's first level (up to the List limit) and not every folder.

**Why:** Opening every folder at once builds the whole tree, which on a big vault is exactly the cost the card limits exist to avoid, and a pasted folder of thousands would have opened itself. One level per press is predictable, stays within the card budget, and needs no confirmation. Measured: a press takes about 50 ms on the 10,000-note vault.

**Cost:** a person who liked "open everything" presses the button a few times. Folders hidden behind "+N more" are not on screen, so they are not opened by Expand folders.

## D-050: A count cache, and vault events that name their paths

**Decision:** `CountCache` (`src/model/counts.ts`) holds, per folder path, the direct subfolder and file counts and, once counted, the totals beneath it. A folder that is not cached is counted once from its own children (totals unknown), so the first draw never waits. After the first draw the whole vault is counted in slices of 250 folders (`COUNT_CHUNK`) with a `setTimeout(0)` between them; a newer tree abandons an older count. After that, `applyChanges` removes entries for folders that no longer exist, counts any new or moved folder with everything inside it, and recounts the folders on the way up from every changed path, deepest first. `watchVault` now gathers the paths of creates, deletes and renames (old and new) for `CHANGE_DELAY_MS` (250 ms) and sends them in one `onStructure(changed)`; the app then updates the counts and rebuilds the tree once. Listeners are passed to the view's `registerEvent` as well as being removed by the returned function. Folder tooltips and the screen reader wording gain the totals. The overview heat-map tint in the request was not built, because there is no such tint in the dashboard and adding one changes the look; the totals are in the cache for it.

**Why:** Measured, the tree and counts for 10,000 notes cost milliseconds (the whole count about 1 ms), so the cache is not what makes a big vault fast; it exists so that nothing is recounted while zooming or hovering, and so recursive totals are available. The tree itself is still rebuilt in full on each (debounced) change, because patching it incrementally is a larger and riskier change than the measured cost justifies; how long Obsidian's own vault walk takes on 10,000 files has not been measured.

**Cost:** until the whole-vault count has reached a folder (a moment after opening), its totals read as unknown and its tooltip leaves them out.

## D-051: Search moves the view, and Enter selects the first match

**Decision:** `firstVisibleHit` (pure, in `model/search.ts`) names the first match that has a card. `FollowSelection` glides the camera to it (only when it is off screen, as for the keyboard) whenever it changes, and `App.svelte` selects it when Enter is pressed in the search box (applying the typed text first, so Enter does not wait for the search delay) and moves focus to the dashboard. Clearing a search bumps `fitKey`, so the camera frames the tree again. Search itself needed no change to look at the whole vault: it already walks the full in-memory tree built from the vault's file list, not the drawn cards, and since D-048 it reveals only the batch that holds a match.

**Why:** A match can sit far from the camera, in a batch the layout has just added, and a search that reveals a card the person cannot see feels like "not found". Selecting the match is also the way to use **Focus selected** on something that was hidden, since a card must exist to be selected. Measured in Chrome on a 10,000-note folder: a note at position 7,500 is found in 15 ms, highlighted and in view, with 1 match counted; a folder in position 77 of 100 can be selected with Enter and focused.

**Cost:** with many matches the camera goes to the first one only. Typing keeps moving the camera as the first match changes, which is the point but can feel busy on a very broad query.

## D-052: Release tooling, the current submission route, and a fade-out for removed cards

**Decision:** `scripts/check-guidelines.mjs` (`npm run check:release`) checks what a script can: manifest fields and rules, that the three version files and the tag agree, README and LICENSE, a placeholder author or licence name, and patterns in the source (unsafe HTML, network calls, global `app`, default hotkeys, console logging, leftover markers, inline styles, `localStorage`, `var`), plus top-level imports from `obsidian` against `minAppVersion`. `ci.yml` runs lint, tests, build and the check on every push and pull request. `release.yml` runs on a bare version tag (no `v`), re-runs everything, fails if the tag differs from the manifest, and attaches the three files to a GitHub release. Paths given to Obsidian when editing go through `normalizePath()`. A removed card now fades out where it was (`FADE_OUT_MS` 180 ms, only up to `MAX_FADING_CARDS` 150 at once, never with reduced motion). The submission steps in `docs/SUBMISSION.md` follow the live Obsidian docs (a directory at community.obsidian.md), and the saved publishing prompt (`docs/PUBLISH-PROMPT.md`) was changed to match and to not fork or clone anything.

**Why:** The pattern check is cheap, runs in CI, and found the two real blockers (the placeholder author and licence name). `minAppVersion` 1.7.2 was checked: the newest API used is `Workspace.revealLeaf` (1.7.2); the settings helpers that look newer in the typings belong to a class this plugin does not use. The guidelines were read from the live docs, not memory, and the old pull request route is no longer described there. The fade is a short courtesy that costs nothing when it is off and is capped so a big collapse does not pay for it.

**Not verified:** the workflows have not run on GitHub. The member APIs (as opposed to imports) are not machine-checked against `minAppVersion`: only a trial on Obsidian 1.7.2 would settle that.

## D-053: Auto-scroll, and why it uses Shift

**Decision:** The view can drift over the cards on its own (`src/layout/autoScroll.ts`, `src/ui/AutoScroll.svelte`). The speed is in screen pixels per second whatever the zoom, so it feels the same anywhere, and the step is capped at 0.1 s so a stalled tab cannot make the view jump. It stops 48 px past the last card, or turns round if "At the end" is Reverse; when every card already fits, or the view is already at that end, it stops at once and shows a short notice rather than doing nothing. It never pulls the view back from where a person took it. Control is Shift and Space (start or pause) and Shift and an arrow key (set the direction and start), plus a play button beside Fit and a "Toggle auto-scroll" command with no default hotkey. The keys act while the pointer is over the dashboard or focus is inside it, and are left alone in a text box or on a button. Plain arrows still move through the cards; Shift and an arrow is ignored by the tree. Anything else that moves the view takes over and pauses it: the component compares the view with where its last step left it, and the canvas pauses it on a pointer press (except on its own button), a handled key, a Fit and a focus in the search box. Enter or Escape in the search box moves the keyboard back to the dashboard (Escape keeps the text). Auto-scroll is not saved with the view; it starts from the settings. It never starts by itself when the system asks for reduced motion.

**Why Shift:** Ctrl is already zoom (Ctrl and scroll), and Ctrl and Space or Ctrl and the arrows are taken by operating-system shortcuts on some systems (input source, desktops). Alt and Space opens the window menu on Windows and many Linux desktops, and an app often cannot stop that. Shift has no system meaning with Space or the arrows, Shift and an arrow would only mean "extend the selection" and the dashboard has no multi-select, and Shift and 1 is already Fit. Plain Space stays what it was, a held key for pan and zoom. The cost: in the search box Shift and Space types a space, so the keyboard has to go back to the dashboard first (Enter or Escape does that).

**Why it has to pause for other movement:** every frame it sets the view directly, and doing so cuts short any animated move that starts meanwhile (Fit, the zoom buttons and the glide to a search match), so they would silently do nothing. Found by driving it in a browser, and fixed by pausing on those actions first.

**Not verified:** nothing here has run in real Obsidian. In particular whether Obsidian or the operating system uses Shift and Space or Shift and the arrows for anything while a dashboard has the keyboard, and how it feels with a trackpad's momentum scrolling. It pauses while the pane is hidden only by waiting (a hidden pane has no size, so it does not move) and does not pause for a dialog that opens over the dashboard.

## D-054: The Saved view button saves the camera, per layout, in the view's own state

**Decision:** The control strip has a Saved view button below the play button (`src/ui/SavedViewButton.svelte`). It saves and restores only the camera. The saved camera is the point in the cards' own coordinates that is in the middle of the pane, and the zoom (`src/layout/camera.ts`), not Svelte Flow's raw offset, so a resized window or an opened sidebar still lands on the same spot. One camera is kept per layout, because a position means nothing outside its layout. The cameras are stored in the dashboard's saved state (`SavedView.cameras`, left out when empty so older states are unchanged, and read back as untrusted: unknown layouts and non-finite or absurd numbers are dropped and the zoom is kept in range). Reset, the layout and the open folders never touch them. With nothing saved, a click saves; once saved, a click goes there and the right-click menu saves again or forgets. The menu is also reached with the menu key, which is the keyboard route.

**Why:** It answers "let me keep a view I like and get back to it from anywhere" without turning Reset into something that does two jobs. The saved state already travels with the tab (Back, restart), so no new storage is needed and the settings table stays flat. Saving the centre rather than the offset keeps it right when the pane changes size.

**Limits:** A saved view belongs to the dashboard tab, so a new tab starts without one. It is a place in the layout, not a set of cards: if Compact or Details is switched, or folders are opened or closed, the cards sit differently and the saved place may show something else. Tooltips come from `aria-label` only (Obsidian turns that into its own tooltip; a `title` as well would show two).

## D-055: Tooltips come from `aria-label` alone

**Decision:** Obsidian shows its own tooltip for any element with an `aria-label`, and the browser shows another for a `title`, so an element with both showed two. Cards, the folder badges and the control strip now carry only `aria-label`, and the `title` is gone. The card's `aria-label` is the screen reader wording (name, kind, open or closed, what it holds); the badge's is the action ("Show files" or "Hide files"); the control buttons' include their shortcut. The tree's own name and instructions moved to visually hidden text referenced by `aria-labelledby` and `aria-describedby`, so they are still announced but cannot pop up over the empty canvas. Numbers in these texts group thousands (en-GB), and "in all" is only said when there are files or folders deeper than the folder's own.

**Cost:** A file card no longer shows its age, size, links and tags on hover. They are on the card with Details on, and in the details panel when it is selected.

**Left alone:** The toolbar's buttons (Mind map, Expand folders, Compact, Locked) still use `title` for their longer explanation, because their visible text is their name and an `aria-label` would replace it. Svelte Flow's own zoom in and zoom out buttons keep the `title` it gives them.
