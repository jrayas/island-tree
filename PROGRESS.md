# Progress

Last updated: milestone 7 (polish and release). All seven milestones are built; what is left needs you (see Next step).

## Done

**Search suggests and loads one card** (D-056)

- A ranked suggestions list from names in memory (folders; files by exact name when Files is on), a combobox in the toolbar, going to a single card by pinning it and the folders above it, a Files button and setting, the old reveal-everything search removed, and the pinned card saved with the dashboard. Checked: 538 unit tests, and in headless Chrome the list and ranking, marked letters, arrow keys, Escape, clicking, going to one deep card and one file among 30 with only that card loaded, the Files switch, the "No folder matches" notice, surviving a remount and Reset. **Not run:** in real Obsidian.

**One short tooltip** (D-055)

- Cards, badges and the control strip carry only an `aria-label` (Obsidian's black tooltip), the tree's long instructions are hidden text, numbers group thousands, and "in all" is only said when it adds something. Checked in the browser: no `title` left on cards, badges or the strip, and the accessibility tree still names and describes the tree. **Not run:** in real Obsidian.

**Saved view button and the new Fit icon** (D-054)

- A pure camera module with tests, the button inside Svelte Flow, one saved camera per layout kept in the dashboard's saved state, a right-click menu, and a frame-with-a-block Fit icon. Checked in headless Chrome: the strip order, saving and returning exactly, Reset leaving it alone, per-layout, a resized pane staying centred on the same spot, the menu actions, and surviving a remount. **Not run:** in real Obsidian, and the menu key.

**Auto-scroll** (D-053)

- A pure step function with tests, a canvas component that drifts the view and pauses when anything else moves it, Shift and Space and Shift and an arrow as keys, a play button beside Fit, a "Toggle auto-scroll" command, four settings in the Layout tab, and Enter or Escape in the search box returning the keyboard to the dashboard. Checked in headless Chrome: speed, pausing, direction, wheel, press, drag, zoom, Fit, Shift and 1, the control button, the command, the end and reversing, the search box, reduced motion, and the two notices. That run found and fixed two real faults (it cut short Fit and the zoom buttons, and the keys needed the pointer over the dashboard). **Not run:** in real Obsidian.

**Milestone 7, release polish** (D-052)

- `npm run check:release`, CI and release workflows, `docs/SUBMISSION.md`, the saved publishing prompt, README install, privacy and known limits, a `SPEC.md` section on where the build differs, a cleanup-on-unload audit (nothing leaks), `normalizePath()` for edited paths, and a fade-out for removed cards. Checked: the script against deliberately bad code, the fade with and without reduced motion in Chrome. **Not run:** the workflows on GitHub, and anything in real Obsidian beyond the first look at the settings page.

**Milestone 7, performance layer, step 4: search and focus** (D-051)

- Search glides the view to the first match, Enter selects it and moves to the dashboard, and clearing the search re-frames the tree. Checked in Chrome on a note at position 7,500 of a 10,000-note folder and a folder at position 77 of 100, in all three layouts. 469 unit tests.

**Milestone 7, performance layer, step 3: counts cache and vault events** (D-050)

- Counts are cached by path, built in slices after the first draw and updated only above each change (both parents of a move); vault events arrive as one update naming every path, registered through the view; totals show in tooltips and the screen reader wording. Checked in Chrome through create, move, rename, delete and a 300-note paste. 465 unit tests. The heat-map tint was not built (there is none today). Not run in Obsidian.

**Milestone 7, performance layer, step 2: Expand folders one level at a time** (D-049)

- Each press opens the folders on screen; when all are open it becomes Collapse folders. New folders stay closed. The start setting opens the first level only. 443 unit tests; checked in Chrome on the small and the 10,000-note vault.

**Milestone 7, performance layer, step 1: batch reveal** (D-048)

- "+N more" now reveals the next batch (the List limit, default 40) instead of everything, up to 1,000 in a folder; a search reveals only the batch with the match; new and moved cards reveal their own batch; only visible cards are drawn. Measured in headless Chrome on a 10,000-note folder: 43 cards at first, 60 frames per second at the ceiling. 441 unit tests.

**Milestone 7, part 2: keyboard and screen reader** (D-047)

- One tab stop with a focus ring, tree-view arrow keys, Enter, F, the camera following the selection, treeitem labels, badges out of the tab order and reduced motion. 424 unit tests; every key checked in headless Chrome with real key events. Not yet tried with a real screen reader.

**Milestone 7, part 1: performance** (D-046)

- Measured a made-up 10,000-note vault and found two freezes (a 10,000-note folder expanded, and a broad search), then fixed them with a card limit per folder (500) and overall (1,000), a delayed search and a match count. Now 0.19 s and 60 frames per second for the folder and 0.9 s for the search. A script writes a real 10,000-note vault to try in Obsidian. Numbers are in `docs/PERFORMANCE.md`; they are from headless Chrome, not Obsidian.

**After milestone 6: Back to the dashboard, and the search fade** (D-045)

- A new Open notes in setting (New tab by default, This tab, Split); This tab lets Obsidian's Back return to the dashboard, which now remembers how it was left (also across a restart). A Dim cards that don't match setting turns the search fade off, with matches always yellow. 382 unit tests; checked in headless Chrome (typing a search, the setting both ways, saving a state and starting a new app from it, a restore after mounting, and ignoring garbage). The real Back navigation in Obsidian has not been run.

**After milestone 6: mouse like Canvas** (D-044)

- Scroll pans, Shift and scroll pans sideways, Ctrl or Cmd (or Space) and scroll zooms, right and middle drags pan, Space and drag pans from a card, Shift and 1 fits, and a Mouse wheel setting swaps pan and zoom. The Fit button is now our own and frames exactly as the automatic fit (it zoomed a small tree to 200% before). 367 unit tests; every action checked in headless Chrome with real wheel, mouse and key events.

**After milestone 6: Compact toggle** (D-043)

- A Compact button in the toolbar and a Density setting. It draws the Compact preset's sizes without changing the saved ones, so switching off restores them exactly. 356 unit tests, build and lint clean; the button was checked in headless Chrome (130 to 100 and back to 130, with the saved width unchanged).
- **Settings page fix** (D-042): the preview's highlighted line used a class string with a space, which Obsidian's `createSvg` rejects, so the page showed only its header. Found from your first real Obsidian screenshot.

**Milestone 1: scaffold** (commit 49d8629)

- Build, plugin shell, empty settings tab, typed settings, release files, lint, Vitest, project docs.

**Milestone 2: read-only tree** (commit a5a6941)

- Tree model with stable ids, visibility rules 1 to 3, vertical layout, cards, curved flowing branches, pan and zoom, dot grid, frame-by-frame gliding. Details in `docs/ARCHITECTURE.md`.

**Milestone 3: navigation** (commit 907dd96)

- Radial layout, Expand folders and Expand files, Reset, search as a temporary overlay, focus mode with breadcrumb, info panel, double click to focus a folder or open a file, camera re-fit on layout, focus and reset.

**Milestone 4: live updates and metadata** (commit 0c55f6a)

- Vault watching with debounce, stable ids across renames and moves, view-state tidying, file details (age, size, links, tags, status), Details toggle and semantic zoom.

**Milestone 5: settings**

- One schema table (`settings/schema.ts`) describes every setting; validation, defaults, controls, presets, resets and export come from it (D-027). Saved data is nested by group, version 2, and version 1 data is migrated.
- Settings page: header, live preview built with the real layout and styles, an accessible horizontal tab strip, and generated controls with a reset button on each row (D-026).
- Cards: size, corner radius, border, padding, text size (0 follows the theme), start-detailed, which details show, status property name. Lines and grid: curve style (curved, step, straight, in both layouts), thickness, dash, flow speed, highlight colour, grid type, size, spacing, opacity and colour. Layout: default layout, gap, level spacing, ring radius and step, list limit, start-expanded switches. Editing: in the schema and validated, no tab yet (milestone 6).
- Presets: Compact, Comfortable and Large; save, rename and delete your own; reset a tab or everything (D-030). Export and import as JSON by clipboard or file, with a summary shown before anything changes (D-031).
- Settings apply live: open dashboards restyle through CSS variables and re-lay out with a re-fit (D-032). Saving waits 300 ms after the last change and flushes on unload.
- Checks: `svelte-check` 0 errors and 0 warnings, 267 unit tests passing, lint 0 errors (one accepted warning, D-026).
- Throwaway jsdom smoke tests (kept outside the project): the settings page was driven end to end against a stand-in for Obsidian's `Setting`, `Modal` and `Notice`, covering every tab, the arrow keys, sliders, toggles, dropdowns, text, reset, all preset actions, export, a hostile import with its summary, reset tab and reset all, the delayed save, and unsubscribing on hide, with no errors. The dashboard was driven against live setting changes: card size, list limit, grid type, details switches, status property and tag switches, and the start-with options.

**Milestone 6: editing** (D-041)

- A Lock button and a Toggle lock command; the dashboard opens locked and locks again after a chosen idle time. While unlocked an editing bar offers Rename, New note, New folder and Delete, the right-click menu offers the same, and a card can be dragged onto a folder to move it. Everything goes through Obsidian's own file APIs (links update, the trash setting is respected). Every change shows a notice with Undo for about seven seconds; the rules and the undo list are pure and unit tested. A new Editing settings tab holds the five settings that were already in the schema.
- Checks: build clean, 349 unit tests, lint 0 errors (one accepted warning). The UI was driven in headless Chrome with real mouse and key events against Obsidian's stylesheet and a stand-in vault: lock and unlock, the menus, a drag with its ghost and green or red highlight, every refusal, Escape, the click after a drag being ignored, new note selected after it appears, rename, delete, the lock command and the automatic lock. The calls into Obsidian itself (`renameFile`, `trashFile`, `create`, `createFolder`, `createBinary`) were checked against its typings but have not been run.

**UI change after milestone 5: one continuous surface** (D-034)

- The graph fills the view below the toolbar and breadcrumb in the same colour as Obsidian Canvas (`--background-primary`), with faint Canvas-like dots. The selection details are floating text instead of a strip (bottom left, 24px from the edges; the zoom buttons are a column on the left edge near the middle, 8px apart, D-035, D-038). The extra bottom gap was Obsidian's own view padding, now overridden (D-037), and the text rises only while the floating status bar actually reaches it. The on-screen Svelte Flow credit is hidden and credited in the README (D-036). The camera frames the tree as soon as the view has a size. The toolbar, cards, connectors and accent colour were not touched.

**Mind map layout** (D-040)

- A third layout with a balanced and a one-sided view, chosen with one toolbar button that cycles them and remembers the choice (a new Layout setting). Card-edge to card-edge branches with the same flowing dashed line as the other layouts, framed with the root in the middle. Checked in headless Chrome with Obsidian's stylesheet: no overlaps, every branch starts and ends on a card edge, all existing controls re-lay it out.

**Zoom to area** (D-039)

- A fourth zoom button (dashed rectangle) and Shift-drag draw a rectangle and glide the camera to fit it, with a minimum size, a zoom cap, Escape to cancel, and no panning while drawing.

## Open issues

- **Milestones 2 to 7 have had almost no run in a real Obsidian vault.** The first real look (the settings page) found a real bug, now fixed (D-042); everything else is untried there. Editing is the one to try carefully, in a scratch vault, because it changes real files. Since the bottom-spacing work they have been driven in headless Chrome with real input events and Obsidian's own stylesheet, outside the project: **branches draw**, the camera frames the tree on load, cards and the zoom controls lay out as intended, and Zoom to area works (D-039). That is still not Obsidian itself, and the radial layout, the settings page and the preview have not been looked at. Please run the milestone 2 to 5 checklists in `docs/DEVELOPMENT.md` and tell me what you see.
- **Canvas colour match** is by variable, not by sight: compare with a Canvas tab as the checklist in `docs/DEVELOPMENT.md` says, and change two lines if your theme gives Canvas its own colour (D-034).
- **Settings page layout** is the part most likely to need visual fixes: the preview's scaling, the tab strip, the row spacing and the slider value labels are written but unseen.
- **Folder renames:** I am not certain whether Obsidian sends one `rename` event for a folder or one per file inside it. The code handles both (D-020).
- **Author name is a placeholder** ("Your name") in `manifest.json` and `LICENSE`. `npm run check:release` fails until you change it.
- **The release and CI workflows have never run on GitHub**, and the repository does not exist yet. Expect a small fix or two on the first run.
- **The settings page opens with a header card showing the plugin name.** The guidelines say not to put a top-level heading with the plugin name in a settings tab. It is a styled block, not a heading, and the lint rule passes, but a reviewer may ask for it to go (`src/settings/SettingsTab.ts`).
- **`minAppVersion` 1.7.2** was checked for imports and the main member APIs from the typings, not by running on 1.7.2.
- **The tree is rebuilt in full on every (debounced) vault change.** Counts are incremental, the tree is not; Obsidian's own vault walk on 10,000 files has not been timed (D-050).
- **No real screen reader has been used**, only the DOM roles and labels checked (D-047).
- **No screenshots in the README yet** (a placeholder is there).
- **Lint warning accepted:** no `getSettingDefinitions()`, so the settings are not in Obsidian 1.13's global settings search (D-026).
- **`npm audit`:** 3 moderate findings via the `obsidian` typings (D-008). Development only.
- **Svelte Flow attribution** is hidden on screen and credited in the README (D-036). Svelte Flow's typings ask people who hide it to consider a Pro subscription; this is a request, not a licence condition (MIT).
- **Spec differences:** command names (D-006), JavaScript easing instead of CSS transitions (D-010), click behaviour (D-013), search as an overlay (D-015), full rebuild instead of incremental or lazy updates (D-020), one card size and one ring radius setting instead of many (D-029). `SPEC.md` keeps the original wording and now has a section listing where the build differs.
- Branches use the target layout's centre, so they look slightly off for a moment while switching layouts (D-019).
- Dates are written in British format whatever the system locale.
- Changing the default layout or the "start with" settings affects the next time the dashboard opens (and Reset), not one already open.

## Next step

The code for all seven milestones is done. What is left is yours, in this order (details in `docs/SUBMISSION.md`):

1. Try it in Obsidian: the checklists in `docs/DEVELOPMENT.md`, in a copy of a real vault, and the two throwaway big vaults from `scripts/synthetic-vault.mjs`. Tell me what you see.
2. Put your real name in `manifest.json` and `LICENSE`.
3. Create the GitHub repository and push; check CI goes green.
4. Take the README screenshots.
5. `npm version 1.0.0`, push the tag, and check the release has three files.
6. Submit through the plugin directory (the live docs say how), using `docs/PUBLISH-PROMPT.md` if you want help.
