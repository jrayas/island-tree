# Changelog

All notable changes are listed here, newest first. Versions follow [semantic versioning](https://semver.org/).

## Unreleased

### Changed

- **Fit to screen shows a very wide or crowded tree whole.** The lowest zoom was 20%, so a tree wider than about five panes was cut off by Fit, and the zoom out button stopped with the tree still overflowing. The lowest zoom is now 2%, for Fit, the zoom buttons, the wheel and zoom to area. At that size cards are only dots; zoom in to read them.

- **Radial layout: cards no longer pile on top of each other, and the card you point at comes to the front.** A ring now grows, only as far as it has to, until its neighbouring cards clear each other (a ring with room is unchanged, and the rings outside it keep their usual distance beyond it). The card under the pointer, and the card the keyboard is on, are drawn above the others in every layout.

- **Search suggests, and loads one card.** Typing in the search box now lists the best matching folders under it, like Obsidian's quick switcher: ranked best first (exact, then the start of the name, then the start of a word, then anywhere, then letters in order), with the matched letters picked out and where each folder lives, at most 8 at a time with the total beside the box. Arrow keys and the mouse move through the list, Enter or a click goes to one, Escape closes the list and a second Escape returns to the dashboard. Going to a card opens only the folders above it and loads only that card (the rest of a long list stays behind its "+N more" card), selects it, highlights it and glides the view to it, then clears the box and moves the keyboard to the dashboard. It no longer reveals every card that matches, so a letter that matches thousands of files costs nothing. The cards already on screen that match the text still get the yellow highlight while you type (and fade, if that setting is on). New **Files** button beside the box, and **Search files too** setting: with it on, a file is found by its exact name only (with or without the extension). The card you went to is remembered with the dashboard and forgotten by Reset and Collapse folders.

- **One short hover tooltip.** Cards and the control buttons showed two tooltips at once: Obsidian's black one and a long white one from the browser. Only the black one is left. A card says, for example, "articles, folder, open, 125 folders and 0 files, 15,101 files in all": thousands are grouped, and "in all" is left out when nothing is nested deeper. A folder's count badge says "Show files" or "Hide files". The tree's long instructions no longer pop up when the pointer rests on the empty canvas; screen readers still read them. The control buttons' tooltips now include their shortcut, such as "Fit to screen (Shift and 1)".

- Folder and file counts are kept in a cache by path. They are counted once after the first draw, in slices that give the browser a turn, and a change recounts only the folders above it (a move updates both the old and the new parent), so a redraw, zoom or hover never recounts anything. A folder's tooltip and screen reader wording now also give the total number of files and folders inside it, once counted. Changes to the vault are gathered for 250 ms into one update, which now names every path involved, and the listeners are registered through the view so Obsidian removes them if the view goes away.

- **Expand folders** now opens one more level each press, and only for the folders on screen; once everything on screen is open it reads **Collapse folders** and closes them all. Folders that appear later (created, moved or pasted) stay closed. The start setting is now **Start with the first level open**. Nothing is built for a folder nobody has reached, so Expand folders can no longer ask for the whole vault at once.

### Added

- **Saved view button.** A bookmark button in the control strip, below the play button. With nothing saved, a click saves the current pan and zoom. Once saved, a click glides the camera back to it from anywhere on the canvas, and a right-click (or the menu key) offers "Save current view here", "Go to saved view" and "Forget saved view". It only moves the camera: open folders, the selection and the search are untouched, and Reset does not clear it. One view is kept per layout (vertical, radial, mind map), it stays centred on the same spot if the window is resized, and it is remembered with the rest of the dashboard's state, so it comes back after Back or a restart. A new tab starts without one.
- A new icon for **Fit to screen**: a frame with a block inside it.

- **Auto-scroll.** The view drifts over the cards at a steady speed, for reading the dashboard hands-free, in any of the layouts. Shift and Space starts and pauses it, Shift and an arrow key points it down, up, left or right and starts it, and a play button beside Fit and a "Toggle auto-scroll" command do the same. It only reacts while the pointer is over the dashboard or the keyboard is in it. Any wheel turn, drag, zoom, click, arrow-key move, Fit or search takes over and pauses it. It stops at the last card (or, as chosen, turns round), and says so if everything is already on screen. New "Auto-scroll" section in the Layout tab: direction, speed (10 to 300 pixels per second, 40 by default), what happens at the end, and starting when the dashboard opens (never with reduced motion). Pressing Enter or Escape in the search box now hands the keyboard back to the dashboard, so these keys work straight after a search.

- Removed cards fade out where they were instead of vanishing (not with reduced motion, and not when many go at once).
- Release tooling: `npm run check:release` (checks the manifest, version files, tag, README, LICENSE and the source against the community rules a script can catch), a CI workflow (lint, tests, build and the check on every push), and a release workflow that builds and publishes `main.js`, `manifest.json` and `styles.css` when a version tag is pushed.
- `docs/SUBMISSION.md` (releasing and submitting, and what only the maintainer can do), `docs/PUBLISH-PROMPT.md` (the publishing prompt, adjusted to the current process), a Privacy section and updated install steps in the README, and "Where the build differs from this spec" in `SPEC.md`.

### Changed

- Paths given to Obsidian when renaming, moving, creating and undoing go through `normalizePath()`.

- Search glides the view to the first match, wherever the layout has put it, reveals only the batch of cards that holds it, and Enter in the search box selects that match and moves to the dashboard, so **Focus selected**, the editing bar and the keyboard work on a result that was hidden. Clearing the search re-frames the tree instead of leaving the view where the match was.
- `scripts/synthetic-vault.mjs` takes the number of notes for the flat shape (for example 20000).

- **"+N more" reveals a batch.** A folder lists its first 40 children (the **List limit** setting, now 2 to 200 with a default of 40), and "+N more" reveals the next 40 each time, up to 1,000 in one folder, then says how many are "not shown". A search reveals only the batch that holds a match. New and moved cards reveal their own batch. Which batches are open is remembered with the rest of the view. The limits live in `src/model/limits.ts`, the overall budget is 1,500 cards, and only the cards on screen are drawn.

- Keyboard and screen reader support. The dashboard is one tab stop with a visible focus ring. Arrow keys move through the cards, Right and Left open and close folders and step in and out, Home and End jump, Enter opens a note or focuses a folder or expands a "+N more" card, and F shows or hides a folder's files. The view follows the selection. Cards are announced with their name, kind, open or closed state and contents (tree and treeitem roles). The folder count badges are no longer tab stops, and with reduced motion switched on nothing animates.

- Big vaults stay smooth. A folder shows at most 500 cards at once and the whole dashboard at most 1,000, filled level by level, with an inert pill ("N not shown") where children are left out; a search finds what is not shown, and shows its matches first. Search now waits about 0.2 s after you stop typing, and the number of matches shows beside the box. Measured on a made-up vault of 10,000 notes: opening a 10,000-note folder went from 5.6 s and 8 frames per second to 0.19 s and 60, and searching "note" from 8.3 s to 0.9 s. See `docs/PERFORMANCE.md`.
- `scripts/synthetic-vault.mjs` writes a made-up vault of real files (balanced, flat or deep) to try on a big vault in Obsidian.

- **Open notes in** (Settings, Layout): New tab (the default), This tab, or Split. This tab opens the note in the dashboard's own tab, so Obsidian's Back returns to the dashboard. In a sidebar, or in a pinned tab, a new tab is used instead. Ctrl or Cmd with double click still opens a split.
- The dashboard now remembers how it was left (layout, open folders and files, focused folder, selected card, search text and the Details toggle), by path. Obsidian hands it back when you press Back and when it restarts. Anything unreadable or no longer in the vault is ignored.
- **Dim cards that don't match** (Settings, Layout): turn the search fade off and every card stays at full strength. Matches keep their yellow ring either way.

- The mouse now behaves like Obsidian's Canvas: scroll pans, Shift and scroll pans sideways, Ctrl or Cmd (or Space) and scroll zooms, right and middle button drags pan as well as the left, Space and drag pans even from a card (cards let the pointer through while Space is held), and Shift and 1 fits the view. A new **Mouse wheel** setting (Settings, Layout) switches the wheel between pan (the default, as in Canvas) and zoom.

- A **Compact** button in the toolbar that switches between compact and comfortable density. Compact draws the sizes of the built-in Compact preset (smaller cards, text and spacing) as an overlay: it never changes your saved sizes, never makes a size larger than you chose, and switching it off restores them exactly. The view re-frames itself when it changes, and the choice is remembered (also **Density** in Settings, Layout).

### Fixed

- The Fit button zoomed a small tree in to 200% while the automatic fit stopped at 100%. The button now frames the cards exactly as the automatic fit does (same padding, the 100% cap, the same glide, and the balanced mind map's symmetric frame).

- The settings page showed only the header and part of the preview in Obsidian, with no tab strip or settings. The preview drew its highlighted line with a class string containing a space, which Obsidian's `createSvg` rejects, and the error stopped the rest of the page being built. It now passes a list of classes.

### Changed

- The graph now fills the whole view below the toolbar and breadcrumb, painted with the same colour as Obsidian's Canvas (`--background-primary`) so the view reads as one continuous surface. The dots default to a fainter, Canvas-like colour (`--background-modifier-border`).
- The selection details moved from a strip at the bottom to plain text floating over the graph at the bottom left: name, path and a quiet details line, fading in and out, never blocking the graph. The folder line no longer starts with the word "Folder".
- The camera frames the tree as soon as the dashboard has a size, as well as when the layout, focus or size settings change.

- The bottom area is less crowded: the selection text moved to the bottom right (right-aligned, lifted clear of Obsidian's status bar, wrapping in narrow panes), the zoom buttons are spaced 8px apart with their own outlines, and the "Svelte Flow" credit moved to the bottom left beneath them.

- The bottom area now uses one spacing value (24px) for the zoom buttons' left and bottom inset and the details text's right and bottom inset, with the last line of the text level with the bottom of the fit button. Long names and paths stop at two lines with an ellipsis and grow upward. The "Svelte Flow" label on screen is removed and credited in the README. The breadcrumb now uses the interface font.

- Fixed the bottom spacing: Obsidian pads every view (12px at the top and sides, 32px at the bottom) and that padding was stacking with the 24px gap, so the zoom buttons and text sat about 56px up and the graph stopped short of the edges. The dashboard now has no padding. The buttons and text rise only while Obsidian's floating status bar covers the view, and drop back to exactly 24px when it is hidden.

- The zoom buttons moved to the left edge, centred 45% of the way down the graph (one variable, `--island-zoom-offset-y`, moves them, and the column stays centred if a button is added). The selection text moved to the bottom left, left-aligned, 24px from the edges, and stops short of the zoom buttons. Only the text rises for Obsidian's floating status bar, and only while the bar reaches it.

### Added

- Milestone 6, editing: a **Locked** or **Unlocked** button in the toolbar and a **Toggle lock** command. The dashboard opens locked and locks again after the minutes set in the new **Editing** settings tab. While unlocked an editing bar offers **Rename**, **New note**, **New folder** and **Delete** for the selected card, right-clicking a card offers the same, and a card can be dragged onto a folder to move it (folders light green when the move is allowed, red with a reason when not). Everything goes through Obsidian's file APIs, so links update and the trash setting is respected. Big folders ask for confirmation. Every change shows a notice with **Undo** for about seven seconds.
- The editing rules (names, moves, confirmations, auto-lock) and the undo list as pure modules with unit tests.

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
