# Changelog

All notable changes are listed here, newest first. Versions follow [semantic versioning](https://semver.org/).

## Unreleased

### Added

- Milestone 3, navigation: a Vertical and Radial layout switch (the radial layout puts the vault in the middle with one ring per level, and gives busier folders more of the circle), **Expand folders** and **Expand files** toggles, **Reset**, a name search that opens the path to each match and fades everything else (clearing it restores your view), **Focus selected** and **Reset focus**, double click a folder to focus on it, a breadcrumb to move back up, and an info panel for the selected card. Double click a file to open it in a new tab, or in a split with Ctrl or Cmd. The camera re-frames when you change layout, focus or reset.
- Radial layout, search, view-state, info panel and open-target rules as pure modules with unit tests.
- Milestone 2, read-only tree: the dashboard now shows the vault as island cards joined by curved, flowing branches on a dotted canvas you can pan and zoom. Click a folder to open or close it, click its badge (subfolders · files) to show that folder's files, and click "+N more" to reveal the rest. The path from the selected card back to the root is highlighted. Cards glide to new positions and new cards grow out of their parent.
- Model, layout and animation modules with unit tests: stable node ids, visibility rules, view state, file types, card text, vertical layout, branch curves and position easing.
- Svelte Flow (`@xyflow/svelte`) for pan, zoom, the dot grid and zoom controls.
- Milestone 1 scaffold: plugin manifest, esbuild and Svelte build, an empty dashboard view that opens in a main tab or the right sidebar, a ribbon icon, the commands "Open dashboard" and "Open dashboard in sidebar", and an empty settings tab.
- Typed settings object with a schema version and a number-clamping helper, with unit tests.
- `manifest.json`, `versions.json`, a version-bump script, README, MIT licence, lint rules (including the Obsidian community plugin rules) and Vitest.
- Project documentation: `PROGRESS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DEVELOPMENT.md` and `BUILD-BRIEF.md`.
