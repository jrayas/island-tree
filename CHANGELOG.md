# Changelog

All notable changes are listed here, newest first. Versions follow [semantic versioning](https://semver.org/).

## Unreleased

### Changed

- The graph now fills the whole view below the toolbar and breadcrumb, painted with the same colour as Obsidian's Canvas (`--background-primary`) so the view reads as one continuous surface. The dots default to a fainter, Canvas-like colour (`--background-modifier-border`).
- The selection details moved from a strip at the bottom to plain text floating over the graph at the bottom left: name, path and a quiet details line, fading in and out, never blocking the graph. The folder line no longer starts with the word "Folder".
- The camera frames the tree as soon as the dashboard has a size, as well as when the layout, focus or size settings change.

- The bottom area is less crowded: the selection text moved to the bottom right (right-aligned, lifted clear of Obsidian's status bar, wrapping in narrow panes), the zoom buttons are spaced 8px apart with their own outlines, and the "Svelte Flow" credit moved to the bottom left beneath them.

- The bottom area now uses one spacing value (24px) for the zoom buttons' left and bottom inset and the details text's right and bottom inset, with the last line of the text level with the bottom of the fit button. Long names and paths stop at two lines with an ellipsis and grow upward. The "Svelte Flow" label on screen is removed and credited in the README. The breadcrumb now uses the interface font.

- Fixed the bottom spacing: Obsidian pads every view (12px at the top and sides, 32px at the bottom) and that padding was stacking with the 24px gap, so the zoom buttons and text sat about 56px up and the graph stopped short of the edges. The dashboard now has no padding. The buttons and text rise only while Obsidian's floating status bar covers the view, and drop back to exactly 24px when it is hidden.

- The zoom buttons moved to the left edge, centred 45% of the way down the graph (one variable, `--island-zoom-offset-y`, moves them, and the column stays centred if a button is added). The selection text moved to the bottom left, left-aligned, 24px from the edges, and stops short of the zoom buttons. Only the text rises for Obsidian's floating status bar, and only while the bar reaches it.

### Added

- Mind map layout: a third layout beside Vertical and Radial, with two views that one toolbar button cycles (the label shows which). Balanced puts the vault in the middle and splits its branches between the right and left so both sides are close in height; one-sided puts the vault at the far left and grows everything to the right in columns. Branches are S-curves (rounded elbows with the Step curve style) from card edge to card edge, with the same flowing dashed line as the other layouts. Expand, Focus, Reset and search work as in the other layouts. The view you choose is remembered, and Settings gains "Mind map view" and a Mind map option for the default layout.
- Mind map layout and branch shapes as pure modules with unit tests.

- Zoom to area: a fourth zoom button (dashed rectangle, accent-coloured while on) and Shift-drag draw a faint rectangle over the graph and glide the camera to fit it with a little space around it. Drags under 20px are ignored, Escape cancels, the zoom stops at 1.5, and the graph cannot pan while you draw. Works in every layout.
- The rules behind it as a pure module with unit tests.

- Milestone 5, settings: a full settings page with a live preview, a horizontal tab strip (Cards, Lines and grid, Layout, Presets) and a reset button on every setting. Cards: size, corner radius, border, padding, text size, which details show, and the status property name. Lines and grid: curve style (curved, step, straight), thickness, dash pattern, flow speed, highlight colour, and the grid (dots, lines or none) with size, spacing, opacity and colour. Layout: default layout, spacing, ring distances, the "+N more" limit, and whether Expand folders and Expand files start on. Presets: Compact, Comfortable and Large, saved presets you can rename and delete, reset one tab or everything, and export or import settings as JSON by file or clipboard, with a summary before anything changes. Changes apply to an open dashboard straight away. Defaults follow your Obsidian theme.
- Settings are validated on load and on import (numbers limited to their range, unknown options and keys ignored, colours must be hex) and saved shortly after the last change. Settings saved by earlier versions are upgraded automatically.
- Settings schema, validation, presets, import and export, CSS variables, the settings store and the new branch shapes as pure modules with unit tests.
- Milestone 4, live updates and file details: the dashboard follows the vault. Creating, deleting, renaming or moving notes updates the cards (a renamed or moved note keeps its place and glides to its new parent), and editing a note refreshes its details once things go quiet. A new **Details** toggle makes cards bigger with a second row for files: a recency dot (green today, amber within a week, grey older), age, size, link count and a status chip taken from the `status` property. Tags, links in and out, modified date and status also show in the info panel, and tags in the card tooltip. Zoomed far out, cards shrink to a type colour and a short name. A `statusProperty` setting (default `status`) is stored, with its control to come in the settings milestone.
- Link counting, status reading, age and size wording, view-state tidying and zoom levels as pure modules with unit tests.
- Milestone 3, navigation: a Vertical and Radial layout switch (the radial layout puts the vault in the middle with one ring per level, and gives busier folders more of the circle), **Expand folders** and **Expand files** toggles, **Reset**, a name search that opens the path to each match and fades everything else (clearing it restores your view), **Focus selected** and **Reset focus**, double click a folder to focus on it, a breadcrumb to move back up, and an info panel for the selected card. Double click a file to open it in a new tab, or in a split with Ctrl or Cmd. The camera re-frames when you change layout, focus or reset.
- Radial layout, search, view-state, info panel and open-target rules as pure modules with unit tests.
- Milestone 2, read-only tree: the dashboard now shows the vault as island cards joined by curved, flowing branches on a dotted canvas you can pan and zoom. Click a folder to open or close it, click its badge (subfolders · files) to show that folder's files, and click "+N more" to reveal the rest. The path from the selected card back to the root is highlighted. Cards glide to new positions and new cards grow out of their parent.
- Model, layout and animation modules with unit tests: stable node ids, visibility rules, view state, file types, card text, vertical layout, branch curves and position easing.
- Svelte Flow (`@xyflow/svelte`) for pan, zoom, the dot grid and zoom controls.
- Milestone 1 scaffold: plugin manifest, esbuild and Svelte build, an empty dashboard view that opens in a main tab or the right sidebar, a ribbon icon, the commands "Open dashboard" and "Open dashboard in sidebar", and an empty settings tab.
- Typed settings object with a schema version and a number-clamping helper, with unit tests.
- `manifest.json`, `versions.json`, a version-bump script, README, MIT licence, lint rules (including the Obsidian community plugin rules) and Vitest.
- Project documentation: `PROGRESS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DEVELOPMENT.md` and `BUILD-BRIEF.md`.
