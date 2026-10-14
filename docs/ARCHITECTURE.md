# Architecture

This file describes what is actually built, not the plan. For the plan see `SPEC.md`. For why choices were made see `DECISIONS.md`.

## Status

| Milestone | Area | Status |
|---|---|---|
| 1 | Scaffold: manifest, build, empty view, ribbon, commands, empty settings tab | Done |
| 2 | Read-only tree, vertical layout, cards, edges, pan and zoom, dot grid | Done (not yet tried in Obsidian, see `PROGRESS.md`) |
| 3 | Radial layout, focus, search, overflow pills, toggles, breadcrumb, info panel | Done (not yet tried in Obsidian; the overflow pill came with milestone 2) |
| 4 | Live updates and metadata | Done (not yet tried in Obsidian) |
| 5 | Settings tabs, presets, import and export | Done (not yet tried in Obsidian). The Editing tab arrives with editing in milestone 6 |
| 6 | Editing, lock, undo | Done (not yet tried in Obsidian; the file operations are thin calls to Obsidian's APIs and were checked against its typings, with the rules and the UI exercised in a browser against a stand-in vault) |
| 7 | Polish, release workflow, submission | Code done (performance layer, keyboard and screen reader support, release tooling, docs). Not yet run on GitHub or tried in a range of real vaults; the maintainer's steps are in `docs/SUBMISSION.md` |

## How the pieces fit (after milestone 6)

```
Obsidian loads main.js + styles.css
  └─ src/main.ts            IslandTreePlugin
       ├─ registerView ──► src/view.ts           IslandTreeView (ItemView)
       │                        └─ mounts ──►     src/ui/App.svelte
       │                              loadTree   = () => readVault(app.vault)       (src/model/vault.ts)
       │                              readMeta   = (path) => MetaReader.read(path)  (src/model/metaSource.ts)
       │                              watchVault = (handlers) => vault events       (src/model/watch.ts)
       │                              openFile   = (path, target) => workspace      (src/actions/open.ts)
       │                              initialLayout = settings.defaultLayout
       ├─ ribbon icon + 2 commands ─► activateView("tab" | "sidebar")
       ├─ addSettingTab ──► src/settings/SettingsTab.ts  (declarative settings: header, live preview, pages)
       └─ store: SettingsStore ◄─► loadData / saveData   (src/settings/store.ts, validated on load)
            └─ every open dashboard and the settings page subscribe: a change restyles (CSS variables)
               and re-lays out the dashboard at once

App.svelte  (owns tree + view state; everything below it is derived)
  RawEntry ─buildTree(registry)─► TreeNode        (rebuilt on create / delete / move; ids stay stable)
  readMeta(path) ─describeMeta─► MetaDisplay      (re-read when metaVersion changes)
  reconcileViewState tidies the view state after every rebuild
  viewState (open folders, batches, pinned cards) ─► the state the visibility rules read
  buildVisibleTree(focus node, viewState) ─► VisibleNode tree
        │                                          │
        │                             computeLayout(mode, detail) ─► card centres (+ radial centre)
        ▼                                          ▼
  describeItem + match flags ─► CanvasItem[]  +  targets (Map id → Point)
                                          └────────► Canvas.svelte
                                                       ├─ animate.ts: glide centres frame by frame
                                                       ├─ FitController: frame the targets when fitKey changes
                                                       └─ SvelteFlow ── IslandNode.svelte (card)
                                                                    └─ BranchEdge.svelte (vertical or radial curve)
  ZoomWatcher copies the camera zoom into ZoomState; cards read it to choose minimal, normal or detailed.
  Toolbar.svelte and Breadcrumb.svelte sit above the canvas; InfoPanel.svelte floats over it. None holds state.
  The canvas and the floating text share .island-stage, which fills the view below the breadcrumb.
```

Data flows one way. Clicks come back up through callbacks (`onnodeclick`, `onbadge`, `onopen` and the toolbar and breadcrumb handlers) and change `viewState`, which re-derives everything below it.

## Modules

### Plugin shell

| File | Purpose |
|---|---|
| `src/main.ts` | Plugin entry. Loads settings through `loadSettingsFrom` (which migrates and validates), owns the `SettingsStore`, registers the view, ribbon icon, commands and settings tab, and flushes pending saves on unload. `activateView` reuses an existing leaf instead of opening duplicates. |
| `src/view.ts` | `IslandTreeView`, a thin `ItemView` that mounts the Svelte app in `onOpen` and unmounts it in `onClose`, passing in the vault reader, the file opener, the metadata reader, the watcher and the settings store. It also writes the settings as CSS variables on its root (`setCssProps`), measures Obsidian's floating status bar and sets `--island-clear` on its root, which lifts the details text only while the bar reaches it (0px otherwise, D-037, D-038), and stops both when closed. View type id: `island-tree-view`. |
| `src/settings/defaults.ts` | Short import for `DEFAULT_SETTINGS`, `SETTINGS_VERSION` and `clampNumber`. The defaults themselves come from the schema. |
| `src/settings/SettingsTab.ts` | The settings page, drawn by Obsidian's declarative API (`getSettingDefinitions()`, 1.13 and later, D-061): a header card and live preview, then one page each for Cards, Lines and grid, Layout, Editing and Presets. Holds the `PresetsPage` and the intro row. |
| `src/settings/definitions.ts` | The settings page as data: `buildDefinitions` lists every setting from the schema (name, description and aliases, which Obsidian's settings search reads) under its page and section, with its control drawn by a `render` callback. Pure, and tested. |

### Model (pure, unit tested; only `vault.ts`, `metaSource.ts` and `watch.ts` import Obsidian)

| File | Purpose |
|---|---|
| `src/model/tree.ts` | `RawEntry` (plain vault description), `TreeNode`, `UidRegistry` (stable ids per path), `compareEntries` (folders first, natural name order), `buildTree`, `indexTree`, `folderUids`, `ancestry`. `UidRegistry.moved` keeps an id when a file or folder is renamed or moved. |
| `src/model/counts.ts` | `CountCache`: folder and file counts by path, direct and total. `countsFor` counts a missing folder once; `build` counts the whole vault in slices that yield to the browser; `applyChanges` recounts only the folders above each changed path (old and new). Pure and tested. |
| `src/model/limits.ts` | Every number that keeps a big vault smooth, in one place: the list limit and its maximum, the per-folder ceiling, the overall card budget and the search delay. |
| `src/model/visibility.ts` | SPEC section 4 rules 1 to 3. `visibleChildren`, `buildVisibleTree`, `flattenVisible`, `filesVisible`. A "+N more" pill is a `VisibleNode` of kind `more` with id `more:<folder uid>`. |
| `src/model/viewState.ts` | `ViewState` (open, showAll, filesFor, filesOn, foldersOn, selected, focusRoot, query, layoutMode) and pure transitions: `toggleOpen`, `toggleFilesFor`, `showAllFor`, `select`, `setFoldersOn`, `setFilesOn` (rules 4 and 5), `focusOn`, `resetFocus`, `setQuery`, `setLayout`, `setDetail`, `resetView`. |
| `src/model/sync.ts` | `reconcileViewState`: after a rebuild, drops ids that no longer exist, clears a vanished selection or focus, and leaves new folders closed, even while Expand folders is on (folders closed by hand stay closed). |
| `src/model/meta.ts` | `FileMeta` and `MetaDisplay`, recency bands, age and size wording, `statusOf` (frontmatter value to status), `statusKind`, `buildLinkIndex` (outgoing and incoming counts from `resolvedLinks`), `describeMeta`. |
| `src/model/search.ts` | Marking the cards already on screen that match what is typed (`matchVisible`), which fade (`isDimmed`), and `nameMatches`. It never opens a folder or loads a card. |
| `src/model/suggest.ts` | What the search box lists while you type: the best few folders (and, with Files on, files), ranked exact, then start of the name, then start of a word, then anywhere, then loose letters in order, with the matched parts and where each lives. Looks at names in memory only. |
| `src/model/reveal.ts` | `revealOne`: going to one card. Opens the folders above it, pins it and them, and selects it, so only that card loads. |
| `src/model/fileType.ts` | File name to category, Lucide icon id and theme-variable colour. |
| `src/model/display.ts` | `describeItem`: the label, icon, counts and tooltip a card shows. |
| `src/model/info.ts` | `describeSelection` and `pathLabel`: the info panel's text. |
| `src/model/vault.ts` | `readVault`: reads `vault.getRoot()` into a `RawEntry`. Not unit tested (needs Obsidian). |
| `src/model/metaSource.ts` | `MetaReader`: reads modified time and size from the file, links from the cached link index, tags with `getAllTags`, and the status property from the frontmatter. Reads only for cards on screen. Not unit tested. |
| `src/model/watch.ts` | `watchVault`: listens to vault `create`, `delete`, `rename`, `modify` and metadata `changed`, `resolved`. Notifications wait for 250 ms of quiet (`CHANGE_DELAY_MS`) and arrive once; a burst of structure changes arrives as one update listing every path involved (both paths of a move); renames are reported at once. Every listener is also handed to the view's `registerEvent`. Returns an unsubscribe function. Not unit tested. |

### Layout (pure, unit tested)

| File | Purpose |
|---|---|
| `src/layout/types.ts` | `LayoutMode`, `LayoutNode`, `Point` (card centre), `LayoutResult` (positions, size, radial `centre`). |
| `src/layout/vertical.ts` | `layoutVertical`: parents centred over children, level `d` at `y = d * (cardHeight + levelGap)`. Subtree widths memoised. |
| `src/layout/radial.ts` | `layoutRadial` and `ringRadius`: root in the middle, one ring per level, angle shared by visible leaf count, starting straight up. |
| `src/layout/mindmap.ts` | `layoutMindMap` and `splitBranches`: the horizontal mind map. Balanced view: root in the middle, the root's branches split in order so both sides are as close in height as possible (ties give the right side the extra branch), the left side reading bottom to top so the order runs clockwise, and a `frame` mirrored about the root so it stays in the middle of the view. One-sided view: root at the far left, centred on the whole tree, one column per level. Also returns the side of every card. D-040. |
| `src/layout/layout.ts` | `computeLayout(mode, root, detail, options)` picks the engine. `cardSizeFor` derives the four card sizes from the one configured width and height using the mockup's ratios (at 116×40: 168×58, 88×30, 132×48). `ringRadii` scales the rings from the first ring's radius (125: 125, 235, 335, 425). Detailed radial rings spread by 1.3. | The mind map uses the plain vertical card size, `gap` as the row gap and twice `levelGap` as the column gap.
| `src/layout/boxZoom.ts` | The rules for Zoom to area: the rectangle between two corners, the 20px minimum, converting a pane rectangle to canvas units, and the camera that fits it with 8% padding and a zoom cap of 1.5. Pure. |
| `src/settings/density.ts` | `withDensity`: the settings as the dashboard should draw them. Compact lowers the size and spacing settings to the Compact preset's values (never raising one) and leaves the saved settings untouched. Used by `App.svelte` for layout and by `view.ts` for the CSS variables. |
| `src/layout/statusBar.ts` | `statusBarClearance`: how far the details text must rise to clear a status bar that reaches it sideways, or 0. Pure geometry. |
| `src/editing/rules.ts` | The editing rules as pure functions: `validateName` (empty, forbidden characters, leading or trailing dots, length, clashes ignoring case), `renamedPath` (keeps a file's extension), `uniqueName`, `checkMove` (same parent, itself, own descendant, clash), `needsConfirmation`, `relockDue` and `countFiles`. |
| `src/editing/undo.ts` | `UndoOperation`, `UndoEntry` and `UndoStack`: what reverses an action, and a short list that lets each entry be used once. |
| `src/editing/api.ts` | `EditingApi`, the only thing the UI knows about editing, plus `EditTarget`, `MenuEntry` and `LockBridge`. No Obsidian types. |
| `src/editing/controller.ts` | `EditingController`, the real `EditingApi`: renames and moves with `fileManager.renameFile`, deletes with `fileManager.trashFile`, creates with `vault.create` and `vault.createFolder`, asks with the shared dialogs, shows the right-click `Menu`, and reverses actions on request. Never throws; checks first and reports with a notice. |
| `src/editing/toast.ts` | The notice with an Undo button that lasts about seven seconds. |
| `src/layout/zoomLevel.ts` | `zoomLevel`: below 0.45 minimal, from 0.7 detailed, otherwise normal. |
| `src/layout/animate.ts` | `easeFactor` (frame-rate independent), `seedPositions` (new cards start at their parent), `stepPositions`. |
| `src/layout/autoScroll.ts` | Auto-scroll as pure rules: the next view for a direction, speed and time step, the end of the cards (with the margin), turning round, "nothing to scroll", whether something else moved the view, and the state change for each action. |
| `src/layout/camera.ts` | A saved camera as pure data: the card-space point at the middle of the pane plus the zoom, converting to and from the view, reading it back safely, and one camera per layout. |
| `src/layout/bounds.ts` | `boundsOfCards`: the box around target positions, for fitting the camera. |
| `src/layout/edgePath.ts` | The branch shapes: curved, step and straight, for the vertical and the radial layout, and `branchPath` which picks one for a curve style. Used by the dashboard and by the settings preview. | For the mind map: `mindMapPath` (card edge to card edge, as an S-curve, or rounded elbows for the step style, never a diagonal).

### Actions

| File | Purpose |
|---|---|
| `src/actions/target.ts` | `openTarget`: Ctrl or Cmd means a split, otherwise the Open notes in setting (new tab, this tab or split). `resolveTarget`: this tab becomes a new tab in a sidebar. Pure and tested. |
| `src/model/synthetic.ts` | Made-up vaults (`balancedVault`, `flatVault`, `deepVault`) as a `RawEntry`, for the performance test. Deterministic. |
| `src/model/perf.test.ts` | Times the pure steps on 10,000 notes and checks the card limits hold, with generous ceilings so it only fails on a real slowdown. |
| `src/model/keyNav.ts` | `navigate`: what an arrow, Home, End or Enter key does through the visible cards (tree-view rules). Pure and tested. F is handled in `App.svelte`. |
| `src/ui/FollowSelection.svelte` | Glides the camera to put a card in view: the selected card when the keyboard moves it off screen, and a card a search has just gone to. Cards already in view are left alone. |
| `src/model/savedView.ts` | `SavedView`, `saveView`, `parseSavedView` and `restoreView`: how the dashboard was left, stored by path (ids change each session), read back defensively and applied only to paths that still exist. |
| `src/ui/scrollBridge.ts` | The link that lets the "Toggle auto-scroll" command reach the app, like the lock bridge. |
| `src/ui/AutoScroll.svelte` | Moves the camera a little every frame while auto-scroll runs, and hands control back when anything else moves it. Sits inside Svelte Flow. |
| `src/ui/CloseUpButton.svelte` | The control strip's magnifier button: glides to the close-up view on the selected card. Sits inside Svelte Flow to reach the viewport. `layout/camera.ts` holds the zoom limits and the close-up maths. |
| `src/ui/stateBridge.ts` | The link between the app and its Obsidian view for saving and restoring the saved view: `snapshot`, `restore` and `changed`. |
| `scripts/check-guidelines.mjs` | Checks the manifest, version files, tag, required files and the source against the community rules a pattern can catch (unsafe HTML, network calls, global `app`, default hotkeys, console logging, placeholders, API versions against `minAppVersion`). Exits 1 on any error. `npm run check:release`. |
| `.github/workflows/ci.yml`, `release.yml` | CI on every push and pull request (lint, tests, build, the rules check). On a bare version tag, the release workflow builds, checks the tag equals the manifest version, and attaches `main.js`, `manifest.json` and `styles.css` to a GitHub release. Not yet run on GitHub. |
| `scripts/synthetic-vault.mjs` | Writes a made-up vault of real files into an empty folder, to open in Obsidian. |
| `src/actions/open.ts` | `openFile`: resolves the path with `vault.getFileByPath` and opens it with `workspace.getLeaf` and `leaf.openFile`, or in the dashboard's own leaf for This tab (not in a sidebar or a pinned tab). Shows a notice if the file has gone. Not unit tested (needs Obsidian). |

### UI (Svelte 5)

| File | Purpose |
|---|---|
| `src/ui/App.svelte` | Root. Takes the `SettingsStore`, keeps the latest settings in `cfg`, builds the tree, holds `viewState`, derives visible items, layout and `CanvasItem[]`. The "start with" settings decide the first view and what Reset returns to. Changes to card size or spacing bump `fitKey` so the camera re-frames; a new status property name makes cards re-read their details. Click rules: a folder click opens or closes it and selects it; a file click selects; a pill click expands the parent's overflow; a badge click toggles that folder's files; a double click focuses a folder or opens a file. |
| `src/ui/Toolbar.svelte` | Layout switch (Vertical, Radial, and Mind map, whose label shows the active view and which cycles it when clicked again), Expand folders, Expand files, Details, Reset, the search box with its dropdown of suggestions and the Files button, Focus selected, Reset focus, and a Lock button that reads Locked or Unlocked. It keeps only the search box's own state (whether the list is open and which row is lit). |
| `src/ui/Breadcrumb.svelte` | Path from the vault root to the focus; ancestors are buttons that move the focus up. |
| `src/ui/EditBar.svelte` | The editing bar under the breadcrumb, shown only while unlocked: the selected card's name and Rename, New note, New folder and Delete. Stateless. |
| `src/ui/InfoPanel.svelte` | Details of the selected card as plain text floating bottom left over the graph, left-aligned: name, path, and one quiet line of details. No box, border or background (a faint halo keeps it readable); it never takes clicks, fades in and out, and keeps its last text while fading. Sits in `.island-stage` with the canvas, `--island-edge-gap` (24px) from the left and bottom, with its height capped so it stops a gap short of the zoom stack. The zoom buttons are a column on the left edge centred on `--island-zoom-offset-y` (45%); see D-038. |
| `src/ui/mouse.ts` | The mouse rules as small pure pieces: `wheelOptions` (the wheel setting as Svelte Flow's scroll options), `zoomKeys`, `PAN_BUTTONS`, `keyBelongsElsewhere` (typing in a box or a focused button keeps its keys) and `isFitShortcut` (Shift and 1). |
| `src/ui/Canvas.svelte` | Wraps Svelte Flow (pan, zoom, mouse behaviour like Obsidian's Canvas, our own Fit button, Space-to-pan, the grid `Background` as dots or lines or nothing, `Controls`). the grid `Background` as dots or lines or nothing, `Controls`). Runs the animation loop: each frame it steps positions and rebuilds `nodes` so branches follow the cards. Passes the curve style to the branches. Respects `prefers-reduced-motion` by jumping straight to the target. |
| `src/ui/ZoomWatcher.svelte` | Lives inside `<SvelteFlow>`; copies the camera zoom into the shared `ZoomState` (`zoomState.svelte.ts`). The level changes only when a threshold is crossed. |
| `src/ui/BoxZoom.svelte` | Zoom to area, inside `<SvelteFlow>`: a transparent layer that takes the drag only while box mode is on (the fourth zoom button) or Shift is held, draws the accent-coloured rectangle, ignores tiny drags, cancels on Escape, and glides the camera to the area. The pane cannot pan while the layer is armed, and Svelte Flow's own selection box is never involved (selection is off). D-039. |
| `src/ui/FitController.svelte` | Lives inside `<SvelteFlow>`; when `fitKey` changes it sets the viewport to frame the target positions. |
| `src/ui/IslandNode.svelte` | The card: icon, name, folder badge (subfolders · files), or the "+N more" pill. With Details on and the camera close enough, a second row shows the recency dot, age, size, links and status chip (folders show their item count). Far out it shows only a type colour and the name. Match ring, fade and compact styling come from its data. |
| `src/ui/BranchEdge.svelte` | In the mind map layout the branch runs card edge to card edge (it is given the card's side and width); the dashed, flowing branch in every layout, drawn with `branchPath` in the chosen curve style, vertical or radial depending on whether the edge data carries a centre. Highlight class on the path from the selected card to the root. |
| `src/ui/cardData.ts` | `CardData` and `CanvasItem` types. Plain values only. |
| `src/ui/context.ts` | Svelte context carrying the badge and double-click callbacks and the shared zoom state to cards. |
| `src/ui/icon.ts` | `use:icon` action that calls Obsidian's `setIcon`. |

### Settings

Everything here is pure and unit tested unless marked Obsidian.

| File | Purpose |
|---|---|
| `src/settings/schema.ts` | The one table of settings: group, tab, section, label, description, type, range and default for each, plus the typed `IslandTreeSettings` (`cards`, `lines`, `canvas`, `layout`, `editing`, `presets`). `DEFAULT_SETTINGS` is built from it. `TABS` lists the tabs shown. |
| `src/settings/validate.ts` | `coerceField` (limit, snap, type-check one value), `sanitiseSettings` (any input to valid settings plus a report of what was applied, adjusted, rejected or ignored), `migrateSettings` (version 1 to 2), `loadSettingsFrom`. |
| `src/settings/presets.ts` | The built-in looks (Compact, Comfortable, Large), saving, renaming and deleting presets, name rules, `applyPreset`, `resetTab`, `resetEverything`. A preset covers the Cards, Lines and grid and Layout settings, not the status property or editing. |
| `src/settings/importExport.ts` | `exportSettings` and `parseImport`: size limit, format and version checks, then the same validation as saved data; imported presets are added unless their name is taken. |
| `src/settings/cssVars.ts` | `settingsToCssVars`: settings to CSS variables. Empty colours and a text size of 0 point at Obsidian theme variables. |
| `src/settings/store.ts` | `SettingsStore`: holds the live settings, notifies subscribers at once, saves 300 ms after the last change, `flush` on unload. |
| `src/settings/format.ts` | Wording for slider values and the preview's grid CSS. |
| `src/settings/controls.ts` | (Obsidian) `configureField`: fills one `Setting` row from a schema entry (slider, dropdown, toggle, colour picker or text), with a reset button that puts the control back in place. Every change goes through `coerceField`. |
| `src/settings/tabs.ts` | (Obsidian) `renderPresetsTab` (built-ins, saved presets, save, reset, export and import). |
| `src/settings/Preview.ts` | (Obsidian) The live preview: three sample cards drawn with the real layout, branch and card styles. |
| `src/settings/modals.ts` | (Obsidian) Dialogs that return promises: ask for text, confirm, and summarise an import. |

### Styles

`src/styles.css` is the source. It imports Svelte Flow's stylesheet, and the build bundles both into the `styles.css` Obsidian loads. That generated `styles.css` is git-ignored; the release attaches the built file. All toolbar, card, branch and canvas rules live here, not in component `<style>` blocks. Rules sit under `.island-tree-view` so they beat Svelte Flow's.

## Build and tooling

| File | Purpose |
|---|---|
| `esbuild.config.mjs` | Two entry points: `src/main.ts` to `main.js` (CommonJS, ES2020, Svelte compiled by `esbuild-svelte`) and `src/styles.css` to `styles.css`. Obsidian, Electron, CodeMirror and Node built-ins are external. Warnings from inside `node_modules` are hidden. Watches by default; `production` builds once, minified, no source map. |
| `tsconfig.json` | Strict TypeScript, `bundler` module resolution. |
| `vitest.config.mts` | Unit tests for `src/**/*.test.ts` in plain Node. |
| `eslint.config.mjs` | TypeScript recommended rules plus `eslint-plugin-obsidianmd`. Linting covers `.ts` files; `.svelte` files are type-checked by `svelte-check`. |
| `version-bump.mjs` | Run by `npm version`; copies the new version into `manifest.json` and `versions.json`. |

## Release files

`manifest.json`, `versions.json` and `package.json` must carry the same version. `versions.json` maps each plugin version to its minimum Obsidian version (currently `1.13.0`, see D-060; it was `1.7.2`, set by `Workspace.revealLeaf`, up to 1.0.0). The release workflow arrives in milestone 7.

## Known limits of what is built

- Every create, delete or move rebuilds the whole tree (with stable ids); it is not patched and collapsed folders are not built lazily. The 10,000-file test in milestone 7 decides whether that needs to change (D-020).
- Folders show no file details beyond their counts and, in Details mode, their item count.
- Undoing a deleted note recreates it from its saved content, so it comes back as a new file (a new modified date, and the trash copy is left in the trash). A deleted folder is not restored by Undo; it says to use the trash. Undo is kept for the session only.
- The settings page uses the classic API, so its settings are not in Obsidian's own settings search on 1.13 and later (D-026).
- Presets store the current values, not a link to the defaults, so a preset made today keeps today's look even if a default changes later.
- Removed cards disappear at once instead of fading out (polish, milestone 7).
- The cards a search has gone to (the card and its folders) stay pinned, so each shows wherever it sits in its list, until another search pick, Collapse folders or Reset. Closing a folder by hand still works.
- Details wording uses British date format (for example 8 Oct 2026) whatever the system locale.
- No keyboard navigation yet (milestone 7).

## Cleanup on unload

Audited on 2026-10-11: every listener, timer, observer and animation frame, and what removes it.

| Where | What | Removed by |
|---|---|---|
| `main.ts` | view, ribbon icon, commands, settings tab | Obsidian, on unload. `onunload` flushes a pending settings save. It does not detach leaves. |
| `view.ts` | store subscription, resize observer, window `resize`, `layout-change` | `onClose` (stop styling, stop measuring); `layout-change` through `registerEvent` |
| `model/watch.ts` | vault and metadata listeners, two debounce timers, the pending path set | The returned function (`offref`, cancel, clear), and `registerEvent` as well |
| `App.svelte` | settings subscription, auto-lock interval, search timer, whole-vault count timer and its slices | Effect clean-up and `onDestroy`; a run counter abandons a count in progress |
| `AutoScroll.svelte` | one animation frame loop while running | Effect clean-up: stopping, or the dashboard closing |
| `Canvas.svelte` | animation frame, drag window listeners, fade-out timer, window key listeners | `onDestroy`; the `svelte:window` handlers are removed by Svelte |
| `BoxZoom.svelte` | window key listeners | Svelte |
| `settings/` | preview subscription, tab and row listeners, the delayed save | `hide()`; listeners die with their elements; `flush` clears the timer |
| `editing/toast.ts`, `settings/modals.ts` | click and key listeners on a notice or dialog | They die with the element |

Nothing found that leaks. Two one-shot zero-delay timers (after a drag, and to focus a dialog) are left to fire.
