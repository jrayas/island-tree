# Architecture

This file describes what is actually built, not the plan. For the plan see `SPEC.md`. For why choices were made see `DECISIONS.md`.

## Status

| Milestone | Area | Status |
|---|---|---|
| 1 | Scaffold: manifest, build, empty view, ribbon, commands, empty settings tab | Done |
| 2 | Read-only tree, vertical layout, cards, edges, pan and zoom, dot grid | Done (not yet tried in Obsidian, see `PROGRESS.md`) |
| 3 | Radial layout, focus, search, overflow pills, toggles, breadcrumb, info panel | Not started (the overflow pill is already in milestone 2) |
| 4 | Live updates and metadata | Not started |
| 5 | Settings tabs, presets, import and export | Not started |
| 6 | Editing, lock, undo | Not started |
| 7 | Polish, release workflow, submission | Not started |

## How the pieces fit (after milestone 2)

```
Obsidian loads main.js + styles.css
  └─ src/main.ts            IslandTreePlugin
       ├─ registerView ──► src/view.ts           IslandTreeView (ItemView)
       │                        └─ mounts ──►     src/ui/App.svelte
       │                              loadTree = () => readVault(app.vault)   (src/model/vault.ts)
       ├─ ribbon icon + 2 commands ─► activateView("tab" | "sidebar")
       ├─ addSettingTab ──► src/settings/SettingsTab.ts  (empty)
       └─ load/saveData  ◄─► src/settings/defaults.ts

App.svelte  (owns tree + view state, all pure below)
  RawEntry ─buildTree─► TreeNode ─buildVisibleTree(viewState)─► VisibleNode tree
                                          │                          │
                                          │                  layoutVertical ─► card centres
                                          ▼                          ▼
                              describeItem ─► CanvasItem[]  +  targets (Map id → Point)
                                                    └────────► Canvas.svelte
                                                                 ├─ animate.ts: glide centres frame by frame
                                                                 └─ SvelteFlow ── IslandNode.svelte (card)
                                                                              └─ BranchEdge.svelte (branch)
```

Data flows one way. Clicks come back up through two callbacks (`onnodeclick`, `onbadge`) and change `viewState`, which re-derives everything below it.

## Modules

### Plugin shell

| File | Purpose |
|---|---|
| `src/main.ts` | Plugin entry. Registers the view, ribbon icon, commands and settings tab. `activateView` reuses an existing leaf instead of opening duplicates. |
| `src/view.ts` | `IslandTreeView`, a thin `ItemView` that mounts the Svelte app in `onOpen` and unmounts it in `onClose`. View type id: `island-tree-view`. |
| `src/settings/defaults.ts` | `IslandTreeSettings` type, `DEFAULT_SETTINGS`, `SETTINGS_VERSION`, `clampNumber`. |
| `src/settings/SettingsTab.ts` | Empty `PluginSettingTab`. |

### Model (pure, unit tested; only `vault.ts` imports Obsidian)

| File | Purpose |
|---|---|
| `src/model/tree.ts` | `RawEntry` (plain vault description), `TreeNode`, `UidRegistry` (stable ids per path), `compareEntries` (folders first, natural name order), `buildTree`, `indexTree`, `ancestry`. |
| `src/model/visibility.ts` | SPEC section 4 rules 1 to 3. `visibleChildren`, `buildVisibleTree`, `flattenVisible`, `filesVisible`. A "+N more" pill is a `VisibleNode` of kind `more` with id `more:<folder uid>`. |
| `src/model/viewState.ts` | `ViewState` (open, showAll, filesFor, filesOn, selected) and pure transitions: `toggleOpen`, `toggleFilesFor`, `showAllFor`, `select`. |
| `src/model/fileType.ts` | File name to category, Lucide icon id and theme-variable colour. |
| `src/model/display.ts` | `describeItem`: the label, icon, counts and tooltip a card shows. |
| `src/model/vault.ts` | `readVault`: reads `vault.getRoot()` into a `RawEntry`. Not unit tested (needs Obsidian). |

### Layout (pure, unit tested)

| File | Purpose |
|---|---|
| `src/layout/types.ts` | `LayoutNode`, `Point` (card centre), `LayoutResult`. |
| `src/layout/vertical.ts` | `layoutVertical`: parents centred over children, level `d` at `y = d * (cardHeight + levelGap)`. Subtree widths memoised. |
| `src/layout/animate.ts` | `easeFactor` (frame-rate independent), `seedPositions` (new cards start at their parent), `stepPositions`. |
| `src/layout/edgePath.ts` | `verticalBranchPath`: the cubic curve between two cards. |

### UI (Svelte 5)

| File | Purpose |
|---|---|
| `src/ui/App.svelte` | Root. Builds the tree once on open, holds `viewState`, derives visible items, layout and `CanvasItem[]`. Click rules: a folder click opens or closes it and selects it; a file click selects; a pill click expands the parent's overflow; a badge click toggles that folder's files. |
| `src/ui/Canvas.svelte` | Wraps Svelte Flow (pan, zoom, dot `Background`, `Controls`). Runs the animation loop: each frame it steps positions and rebuilds `nodes` so branches follow the cards. Respects `prefers-reduced-motion` by jumping straight to the target. |
| `src/ui/IslandNode.svelte` | The card: icon, name, folder badge (subfolders · files), or the "+N more" pill. |
| `src/ui/BranchEdge.svelte` | The curved dashed branch. Highlight class on the path from the selected card to the root. |
| `src/ui/cardData.ts` | `CardData` and `CanvasItem` types. Plain values only. |
| `src/ui/context.ts` | Svelte context carrying the badge callback to cards. |
| `src/ui/icon.ts` | `use:icon` action that calls Obsidian's `setIcon`. |

### Styles

`src/styles.css` is the source. It imports Svelte Flow's stylesheet, and the build bundles both into the `styles.css` Obsidian loads. That generated `styles.css` is git-ignored; the release attaches the built file. All card, branch and canvas rules live here, not in component `<style>` blocks. Rules sit under `.island-tree-view` so they beat Svelte Flow's.

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
- Vertical layout only; card sizes and spacing are constants in `App.svelte` until milestone 5.
- Removed cards disappear at once instead of fading out (polish, milestone 7).
- Clicking a card selects it; opening files, focus and search are milestone 3.
- No keyboard navigation yet (milestone 7).
