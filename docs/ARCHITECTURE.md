# Architecture

This file describes what is actually built, not the plan. For the plan see `SPEC.md`. For why choices were made see `DECISIONS.md`.

## Status

| Milestone | Area | Status |
|---|---|---|
| 1 | Scaffold: manifest, build, empty view, ribbon, commands, empty settings tab | Done |
| 2 | Read-only tree, vertical layout, cards, edges, pan and zoom, dot grid | Not started |
| 3 | Radial layout, focus, search, overflow pills, toggles, breadcrumb, info panel | Not started |
| 4 | Live updates and metadata | Not started |
| 5 | Settings tabs, presets, import and export | Not started |
| 6 | Editing, lock, undo | Not started |
| 7 | Polish, release workflow, submission | Not started |

## How the pieces fit (after milestone 1)

```
Obsidian loads main.js
  └─ src/main.ts            IslandTreePlugin
       ├─ registerView  ──► src/view.ts          IslandTreeView (ItemView)
       │                         └─ mounts ──►    src/ui/App.svelte  (placeholder)
       ├─ ribbon icon + 2 commands ─► activateView("tab" | "sidebar")
       ├─ addSettingTab ──► src/settings/SettingsTab.ts  (empty)
       └─ load/saveData  ◄─► src/settings/defaults.ts    (types, defaults, clampNumber)
```

## Modules

| File | Purpose |
|---|---|
| `src/main.ts` | Plugin entry. Registers the view, ribbon icon, commands and settings tab. `activateView` reuses an existing leaf instead of opening duplicates. Loads settings by merging saved data over `DEFAULT_SETTINGS`. |
| `src/view.ts` | `IslandTreeView`, a thin `ItemView` that mounts the Svelte app in `onOpen` and unmounts it in `onClose`. View type id: `island-tree-view`. |
| `src/ui/App.svelte` | Placeholder root component. Replaced by the canvas in milestone 2. |
| `src/settings/defaults.ts` | `IslandTreeSettings` type, `DEFAULT_SETTINGS`, `SETTINGS_VERSION` and `clampNumber`. Pure, so it is unit tested. |
| `src/settings/SettingsTab.ts` | Empty `PluginSettingTab`. |
| `styles.css` | Styles using Obsidian theme variables. |

## Build and tooling

| File | Purpose |
|---|---|
| `esbuild.config.mjs` | Bundles to `main.js` (CommonJS, ES2020). Svelte compiled by `esbuild-svelte` with CSS injected into the bundle. Obsidian, Electron, CodeMirror and Node built-ins are external. Watches by default; `production` builds once, minified, with no source map. |
| `tsconfig.json` | Strict TypeScript, `bundler` module resolution. |
| `vitest.config.mts` | Unit tests for `src/**/*.test.ts` in plain Node. |
| `eslint.config.mjs` | TypeScript recommended rules plus `eslint-plugin-obsidianmd`. |
| `version-bump.mjs` | Run by `npm version`; copies the new version into `manifest.json` and `versions.json`. |

## Release files

`manifest.json`, `versions.json` and `package.json` must carry the same version. `versions.json` maps each plugin version to its minimum Obsidian version (currently `1.7.2`, set by `Workspace.revealLeaf`). The release workflow arrives in milestone 7.

## Not built yet

Tree model, layouts, canvas, metadata, live updates, settings controls, editing. Svelte Flow is not installed until milestone 2.
