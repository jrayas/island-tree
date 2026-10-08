# Architecture

This file describes what is actually built, not the plan. For the plan see `SPEC.md`. For why choices were made see `DECISIONS.md`.

## Status

| Milestone | Area | Status |
|---|---|---|
| 1 | Scaffold: manifest, build, empty view, ribbon, commands, empty settings tab | Done |
| 2 | Read-only tree, vertical layout, cards, edges, pan and zoom, dot grid | Done (not yet tried in Obsidian, see `PROGRESS.md`) |
| 3 | Radial layout, focus, search, overflow pills, toggles, breadcrumb, info panel | Done (not yet tried in Obsidian; the overflow pill came with milestone 2) |
| 4 | Live updates and metadata | Not started |
| 5 | Settings tabs, presets, import and export | Not started |
| 6 | Editing, lock, undo | Not started |
| 7 | Polish, release workflow, submission | Not started |

## How the pieces fit (after milestone 3)

```
Obsidian loads main.js + styles.css
  └─ src/main.ts            IslandTreePlugin
       ├─ registerView ──► src/view.ts           IslandTreeView (ItemView)
       │                        └─ mounts ──►     src/ui/App.svelte
       │                              loadTree   = () => readVault(app.vault)       (src/model/vault.ts)
       │                              openFile   = (path, target) => workspace      (src/actions/open.ts)
       │                              initialLayout = settings.defaultLayout
       ├─ ribbon icon + 2 commands ─► activateView("tab" | "sidebar")
       ├─ addSettingTab ──► src/settings/SettingsTab.ts  (empty)
       └─ load/saveData  ◄─► src/settings/defaults.ts

App.svelte  (owns tree + view state; everything below it is derived)
  RawEntry ─buildTree─► TreeNode
  viewState ─withSearchReveal(searchTree)─► effective state
  buildVisibleTree(focus node, effective) ─► VisibleNode tree
        │                                          │
        │                             computeLayout(mode) ─► card centres (+ radial centre)
        ▼                                          ▼
  describeItem + search flags ─► CanvasItem[]  +  targets (Map id → Point)
                                          └────────► Canvas.svelte
                                                       ├─ animate.ts: glide centres frame by frame
                                                       ├─ FitController: frame the targets when fitKey changes
                                                       └─ SvelteFlow ── IslandNode.svelte (card)
                                                                    └─ BranchEdge.svelte (vertical or radial curve)
  Toolbar.svelte, Breadcrumb.svelte and InfoPanel.svelte sit around the canvas and hold no state.
```

Data flows one way. Clicks come back up through callbacks (`onnodeclick`, `onbadge`, `onopen` and the toolbar and breadcrumb handlers) and change `viewState`, which re-derives everything below it.

## Modules

### Plugin shell

| File | Purpose |
|---|---|
| `src/main.ts` | Plugin entry. Registers the view, ribbon icon, commands and settings tab. `activateView` reuses an existing leaf instead of opening duplicates. |
| `src/view.ts` | `IslandTreeView`, a thin `ItemView` that mounts the Svelte app in `onOpen` and unmounts it in `onClose`, passing in the vault reader, the file opener and the default layout. View type id: `island-tree-view`. |
| `src/settings/defaults.ts` | `IslandTreeSettings` type, `DEFAULT_SETTINGS`, `SETTINGS_VERSION`, `clampNumber`. Re-exports `LayoutMode`. |
| `src/settings/SettingsTab.ts` | Empty `PluginSettingTab`. |

### Model (pure, unit tested; only `vault.ts` imports Obsidian)

| File | Purpose |
|---|---|
| `src/model/tree.ts` | `RawEntry` (plain vault description), `TreeNode`, `UidRegistry` (stable ids per path), `compareEntries` (folders first, natural name order), `buildTree`, `indexTree`, `folderUids`, `ancestry`. |
| `src/model/visibility.ts` | SPEC section 4 rules 1 to 3. `visibleChildren`, `buildVisibleTree`, `flattenVisible`, `filesVisible`. A "+N more" pill is a `VisibleNode` of kind `more` with id `more:<folder uid>`. |
| `src/model/viewState.ts` | `ViewState` (open, showAll, filesFor, filesOn, foldersOn, selected, focusRoot, query, layoutMode) and pure transitions: `toggleOpen`, `toggleFilesFor`, `showAllFor`, `select`, `setFoldersOn`, `setFilesOn` (rules 4 and 5), `focusOn`, `resetFocus`, `setQuery`, `setLayout`, `resetView`. |
| `src/model/search.ts` | `searchTree` finds name matches, their ancestors and parent folders. `withSearchReveal` turns that into a temporary overlay on the visibility state (rule 7). `isDimmed` says which cards fade. |
| `src/model/fileType.ts` | File name to category, Lucide icon id and theme-variable colour. |
| `src/model/display.ts` | `describeItem`: the label, icon, counts and tooltip a card shows. |
| `src/model/info.ts` | `describeSelection` and `pathLabel`: the info panel's text. |
| `src/model/vault.ts` | `readVault`: reads `vault.getRoot()` into a `RawEntry`. Not unit tested (needs Obsidian). |

### Layout (pure, unit tested)

| File | Purpose |
|---|---|
| `src/layout/types.ts` | `LayoutMode`, `LayoutNode`, `Point` (card centre), `LayoutResult` (positions, size, radial `centre`). |
| `src/layout/vertical.ts` | `layoutVertical`: parents centred over children, level `d` at `y = d * (cardHeight + levelGap)`. Subtree widths memoised. |
| `src/layout/radial.ts` | `layoutRadial` and `ringRadius`: root in the middle, one ring per level, angle shared by visible leaf count, starting straight up. |
| `src/layout/layout.ts` | `computeLayout(mode, root)` picks the engine and holds the card size per mode (116×40 vertical, 88×30 radial). |
| `src/layout/animate.ts` | `easeFactor` (frame-rate independent), `seedPositions` (new cards start at their parent), `stepPositions`. |
| `src/layout/bounds.ts` | `boundsOfCards`: the box around target positions, for fitting the camera. |
| `src/layout/edgePath.ts` | `verticalBranchPath` and `radialBranchPath`: the cubic curves between two cards. |

### Actions

| File | Purpose |
|---|---|
| `src/actions/target.ts` | `openTarget`: Ctrl or Cmd means a split, otherwise a new tab. Pure and tested. |
| `src/actions/open.ts` | `openFile`: resolves the path with `vault.getFileByPath` and opens it with `workspace.getLeaf` and `leaf.openFile`. Shows a notice if the file has gone. Not unit tested (needs Obsidian). |

### UI (Svelte 5)

| File | Purpose |
|---|---|
| `src/ui/App.svelte` | Root. Builds the tree once on open, holds `viewState`, derives visible items, layout and `CanvasItem[]`. Click rules: a folder click opens or closes it and selects it; a file click selects; a pill click expands the parent's overflow; a badge click toggles that folder's files; a double click focuses a folder or opens a file. `fitKey` is bumped for layout, focus and reset so the camera re-frames. |
| `src/ui/Toolbar.svelte` | Layout switch, Expand folders, Expand files, Reset, search box, Focus selected, Reset focus. Stateless. |
| `src/ui/Breadcrumb.svelte` | Path from the vault root to the focus; ancestors are buttons that move the focus up. |
| `src/ui/InfoPanel.svelte` | Details of the selected card, in an `aria-live` region. |
| `src/ui/Canvas.svelte` | Wraps Svelte Flow (pan, zoom, dot `Background`, `Controls`). Runs the animation loop: each frame it steps positions and rebuilds `nodes` so branches follow the cards. Respects `prefers-reduced-motion` by jumping straight to the target. |
| `src/ui/FitController.svelte` | Lives inside `<SvelteFlow>`; when `fitKey` changes it sets the viewport to frame the target positions. |
| `src/ui/IslandNode.svelte` | The card: icon, name, folder badge (subfolders · files), or the "+N more" pill. Match ring, fade and compact styling come from its data. |
| `src/ui/BranchEdge.svelte` | The curved dashed branch, vertical or radial depending on whether the edge data carries a centre. Highlight class on the path from the selected card to the root. |
| `src/ui/cardData.ts` | `CardData` and `CanvasItem` types. Plain values only. |
| `src/ui/context.ts` | Svelte context carrying the badge and double-click callbacks to cards. |
| `src/ui/icon.ts` | `use:icon` action that calls Obsidian's `setIcon`. |

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

`manifest.json`, `versions.json` and `package.json` must carry the same version. `versions.json` maps each plugin version to its minimum Obsidian version (currently `1.7.2`, set by `Workspace.revealLeaf`). The release workflow arrives in milestone 7.

## Known limits of what is built

- The vault is read in full each time the dashboard opens; it does not react to file changes yet (milestone 4).
- Card sizes, gaps and ring radii are constants in `layout/layout.ts` and `layout/radial.ts` until milestone 5.
- Removed cards disappear at once instead of fading out (polish, milestone 7).
- While a search is active, folders on the way to a match stay open; closing one by hand has no effect until the search is cleared.
- The info panel shows only the path, kind and counts; dates, sizes, links, tags and status arrive in milestone 4.
- No keyboard navigation yet (milestone 7).
