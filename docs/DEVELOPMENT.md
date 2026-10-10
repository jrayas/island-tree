# Development

## Requirements

- Node.js 20 or later (developed on 26) and npm.
- Obsidian desktop, with a separate test vault. Do not develop against your real vault.

## Setup

```powershell
npm install
```

## Commands

These match the `scripts` in `package.json`.

| Command | What it does |
|---|---|
| `npm run dev` | Bundles to `main.js` and `styles.css` with inline source maps and rebuilds on every change. |
| `npm run build` | Type-checks with `svelte-check`, then makes a minified production `main.js` and `styles.css`. |
| `npm run check` | Type-check only. |
| `npm test` | Runs the unit tests once. |
| `npm run lint` | Lints `src` with TypeScript and Obsidian community plugin rules. |
| `npm version <x.y.z>` | Bumps `package.json`, then `version-bump.mjs` updates `manifest.json` and `versions.json`. |

## Trying the plugin in Obsidian (hot-reload workflow)

1. Create a test vault in Obsidian.
2. Link this folder into the vault as the plugin folder. In PowerShell, from an administrator prompt, or with Developer Mode on:

   ```powershell
   New-Item -ItemType SymbolicLink -Path "<test vault>\.obsidian\plugins\island-tree" -Target "<path to this project>"
   ```

   Alternatively copy `main.js`, `manifest.json` and `styles.css` (both built files are git-ignored, so run a build first) into `<test vault>\.obsidian\plugins\island-tree\` after each build.
3. In Obsidian, open **Settings → Community plugins**, turn off restricted mode, and enable **Island tree**.
4. Run `npm run dev` and leave it running. Reload after a rebuild with the command **Reload app without saving**, or disable and re-enable the plugin.
5. Optional: install the community "Hot Reload" plugin in the test vault and create an empty file named `.hotreload` in this project folder. It then reloads the plugin whenever `main.js` changes. (`.hotreload` is git-ignored.)

## Test checklist

Run through this by hand before each commit that changes behaviour. Tick items off in `PROGRESS.md` when a milestone is finished.

**Milestone 1**

- [ ] `npm run build`, `npm test` and `npm run lint` finish with no errors.
- [ ] The plugin enables without errors in the developer console (Ctrl+Shift+I).
- [ ] The ribbon icon opens the dashboard view in a main tab.
- [ ] **Open dashboard** and **Open dashboard in sidebar** both work from the command palette.
- [ ] Running a command again focuses the existing view instead of opening a second one.
- [ ] The settings page shows an Island tree entry with placeholder text (milestone 5 fills it in).
- [ ] Disabling the plugin closes the view and leaves no console errors.
- [ ] No hotkey is assigned to either command by default.

**Milestone 2** (use a test vault with a few folders, and one folder with more than six items)

- [ ] The dashboard opens showing the vault name as the top card with its subfolders below, joined by curved dashed lines that slowly flow.
- [ ] A dotted grid shows behind the cards. Dragging the background pans and scrolling zooms. The zoom buttons and fit button (left edge, near the middle) work.
- [ ] Clicking a folder opens it, with its subfolders gliding out from it, and clicking it again closes it. The branches stay attached to the cards while they move.
- [ ] Clicking a card selects it (blue ring) and the lines from it up to the root turn the accent colour and flow faster.
- [ ] The badge on a folder (for example `2·5`) shows that folder's files when clicked, and hides them when clicked again. Clicking the badge does not also close the folder.
- [ ] A folder with more than six children shows a dashed "+N more" card. Clicking it shows the rest.
- [ ] File cards show the icon and colour for their type (Markdown, code, image, PDF, canvas).
- [ ] Light and dark themes both look right, and the card text is readable.
- [ ] With "Reduce motion" turned on in Windows, cards jump instead of gliding and the lines do not animate.
- [ ] Closing the tab leaves no errors in the developer console (Ctrl+Shift+I), and reopening it starts with only the top level open.

**Milestone 3** (use a test vault with nested folders, a folder with more than six items and a few notes)

- [ ] **Radial** moves the cards onto rings around the vault card, gliding there, with smaller cards and branches that curve around the centre. **Vertical** goes back. The view re-frames each time.
- [ ] In the radial layout a folder with many descendants gets a wider slice of the circle than an empty one, and no cards overlap.
- [ ] **Expand folders** opens every folder. Turning it off closes everything back to the top level.
- [ ] **Expand files** lists the files of every open folder. Turning it off hides them again, including any folder you had switched on with its badge.
- [ ] Typing in **Search names** opens the path to each match, rings the matches in yellow and fades the other cards. Clearing the box returns to exactly what was open before.
- [ ] Double click a folder: the view focuses on it, the breadcrumb shows `Vault / Folder`, and **Reset focus** is enabled. Clicking `Vault` in the breadcrumb (or **Reset focus**) goes back.
- [ ] **Focus selected** is greyed out until a folder is selected.
- [ ] Selecting a card fades in plain text at the bottom left, left-aligned: the name in bold, the path in smaller muted text and one quiet line (folder counts, or the file's type and details). Selecting nothing fades it out. It has no box and never blocks dragging or clicking.
- [ ] Double click a note: it opens in a new tab. Ctrl (Cmd) with double click opens a split. Double clicking a file that was deleted after the dashboard opened shows a short notice, not an error.
- [ ] **Reset** returns to the starting view and keeps the layout you chose.
- [ ] The dashboard starts in the layout chosen as the default layout in the settings (vertical until you change it).
- [ ] No errors in the developer console (Ctrl+Shift+I) during any of the above.

**Milestone 4** (use notes with links between them, tags, and a `status:` property in some frontmatter; both light and dark themes)

- [ ] Create a note in the file explorer: its card appears, growing out of its folder, within about a quarter of a second. Delete it: the card goes. Rename it: the card keeps its place and changes its name, and it stays selected if it was.
- [ ] Move a note to another folder by dragging it in the file explorer: its card glides to the new parent.
- [ ] Rename or move a whole folder: the folder and its open children keep their state (open, files shown).
- [ ] Typing in a note does not make the dashboard flicker or stall. Saving a change to its links, tags or `status` updates its card within a moment.
- [ ] **Details** makes cards bigger and, when zoomed in, adds a second row to files: a coloured dot (green edited today, amber within a week, grey older), the age, the size, the link count and a status chip. Folders show their item count.
- [ ] A `status: done` note has a green chip, `status: review` a blue one, any other status an amber one, and a note with no status has none.
- [ ] Hovering a file card shows its age, size, links and tags. Selecting it shows the modified date, size, links out and backlinks, tags and status in the info panel.
- [ ] Zoom out with the scroll wheel: below about 45 percent cards shrink to a coloured dot and a short name; zooming back in restores them. The detail row only shows at about 70 percent and above.
- [ ] With Details on, the radial layout spreads the rings so the bigger cards do not overlap.
- [ ] The tab can be closed and reopened after many edits with no errors in the developer console, and after closing, editing notes causes no console errors (the listeners are removed).
- [ ] The `status` property name can now be changed in the settings (milestone 5), and cards pick up the new name.

**Milestone 5** (open **Settings → Island tree** with a dashboard open beside it if you can, in both light and dark themes)

- [ ] The page shows a header, a live preview of three sample cards, a tab strip (Cards, Lines and grid, Layout, Presets) and the settings for the chosen tab. Resizing the settings window narrow makes the tab strip scroll sideways.
- [ ] Tab keyboard use: Tab reaches the selected tab, the Left and Right arrows move between tabs, Home and End jump to the first and last.
- [ ] Moving **Card width**, **Corner radius**, **Text size** and the other card controls changes the preview at once, and an open dashboard follows (cards resize and glide, the camera re-frames).
- [ ] **Text size** at 0 shows "the theme size" and follows Obsidian's interface text size.
- [ ] **Start with details on** and the five **Show** switches change the preview's second row. With **Show size** off, the size disappears from the dashboard's detail row. **Show tags** off removes tags from the card tooltip and the info panel.
- [ ] **Status property**: change it to the name you use in your notes; the status chips follow. A blank value is ignored.
- [ ] Lines and grid: curve style (curved, step, straight), thickness, dash pattern and the highlight colour change the dashboard's branches and the selected card's path. **Flow speed** 0 stops the animation. The colour pickers have a "Use the theme colour" button.
- [ ] Grid: dots, lines and none, with size, spacing, opacity and colour. The dashboard background follows.
- [ ] Layout: card gap, level spacing, first ring radius, ring step and **List limit** change the dashboard (the "+N more" card appears later or earlier). **Start with all folders open** and **Start with files shown** decide what a freshly opened dashboard, and **Reset**, return to.
- [ ] Every row has a reset button that returns just that setting to its default.
- [ ] Presets: **Compact**, **Comfortable** and **Large** each change the look when applied. **Save preset** keeps the current look under a name; a blank, duplicate or built-in name is refused with a message. A saved preset can be applied, renamed and deleted (with a confirmation).
- [ ] **Reset tab** and **Reset all** work, and **Reset all** asks first and keeps saved presets.
- [ ] Export: **Copy** puts JSON on the clipboard and **Save file** downloads `island-tree-settings.json`. Import: **Paste** and **Choose file** show a summary before anything changes. Edit the JSON to set `cards.width` to 9999 and add an unknown key: the summary says the width was adjusted to 260 and the key ignored. A file that is not an Island tree settings file shows a short notice.
- [ ] Close and reopen Obsidian: every setting, and the saved presets, are still there.
- [ ] Settings made in an earlier version (a vault that used the plugin before milestone 5) still load: the default layout and status property are kept.
- [ ] No errors in the developer console (Ctrl+Shift+I) while using any of the above.

**Keyboard and screen reader** (use the keyboard only; a screen reader such as NVDA on Windows or VoiceOver on a Mac if you have one)

- [ ] Tab reaches the toolbar buttons one by one, then the search box, then Lock, then the dashboard as a single stop with an accent-coloured ring, then the zoom buttons. The folder count badges are not stops.
- [ ] On the dashboard: Down and Up move the selection through the cards; Right opens a closed folder, Right again steps into it; Left steps back out and then closes it; Home and End jump. The selected card keeps its ring and the details text updates.
- [ ] Zoom in a lot, then press End: the view glides to the selected card. A click on a card already in view does not move the view.
- [ ] Enter on a note opens it (Ctrl or Cmd and Enter in a split); Enter on a folder focuses it; Enter on a "+N more" card shows more. F shows or hides a folder's files.
- [ ] Alt and Left still goes Back in Obsidian. Arrow keys in the search box or a rename box move the text cursor, not the selection.
- [ ] A screen reader says something like "Projects, folder, open, 2 folders and 1 file" for a folder and "roadmap.md, file" for a note, and reads the details text when the selection changes.
- [ ] Turn on "Reduce motion" (Windows: Settings, Accessibility, Visual effects, Animation effects off; Mac: Accessibility, Display, Reduce motion): the dashes stop flowing, cards jump instead of gliding, and the camera jumps instead of animating.

**Open notes in, Back, and search** (the dashboard in a main tab)

- [ ] Settings, Layout, **Open notes in** is New tab by default: a double click on a note opens it in a new tab and the dashboard stays.
- [ ] Set it to **This tab**. Expand a few folders, switch to Radial, select a card, then double click a note: the note replaces the dashboard. Press Back (the arrow, Alt and Left, or the mouse's back button): the dashboard returns with the same layout, open folders and selected card. Forward goes to the note again.
- [ ] With the dashboard in a **sidebar** and This tab chosen, a double click still opens a new tab. Ctrl or Cmd with double click opens a split whatever the setting says.
- [ ] Close and reopen Obsidian: the dashboard comes back with how you left it (open folders, layout, selection).
- [ ] Type a search: matches turn yellow, other cards fade. Settings, Layout, turn **Dim cards that don't match** off: no card fades, matches stay yellow. Clearing the search returns the view.

**Mouse, as in Canvas** (compare with an open Canvas beside it)

- [ ] Scroll pans up and down; Shift and scroll pans sideways; Ctrl (or Cmd) and scroll zooms toward the pointer; a trackpad pinch zooms. Holding Space and scrolling zooms too.
- [ ] Dragging the background pans with the left, middle or right button. Right-clicking a card still opens its menu, and a right-drag on a card does not leave a menu behind.
- [ ] Unlock editing, hold Space and drag from a card: the view pans and the card does not move. Release Space: dragging a card moves it again. Space typed in the search box or a rename box does nothing to the view.
- [ ] The fit button (corner brackets) and Shift and 1 frame the tree the same way the dashboard does when it opens, and a small tree is never enlarged past 100%.
- [ ] Settings, Layout, **Mouse wheel** set to Zoom: scroll zooms, and Ctrl (or Cmd) is no longer needed; Space and scroll pans.

**Compact button** (toolbar, after Details)

- [ ] Click **Compact**: cards and spacing shrink, the button is highlighted, and the view re-frames. Click it again: your own sizes return exactly (try it after setting a custom card width in Settings, Cards).
- [ ] Settings, Layout, **Density** shows the same state as the button, and changing either updates the other. Compact never makes a card larger than your own setting.
- [ ] Close and reopen the dashboard: the choice is remembered. Compact works in Vertical, Radial and Mind map.

**Milestone 6** (try it in a scratch vault first; in all three layouts)

- [ ] The dashboard opens locked: the toolbar button says **Locked**, there is no editing bar, cards cannot be dragged, and right-clicking a card selects it and offers only a disabled "Locked: unlock to edit".
- [ ] Click **Locked**: it becomes **Unlocked** (accent-coloured), the editing bar appears under the breadcrumb, and cards show a grab cursor. The vault card cannot be dragged, renamed or deleted. The command palette entry **Toggle lock** (only listed while the dashboard is the active view) does the same.
- [ ] **Rename:** the dialog shows the name without its extension. A name that is empty, has a forbidden character (`\ / : * ? " < > |`), starts with a dot, ends with a dot or space, or already exists next to it, shows a message and is refused. A good name renames the file, keeps `.md`, updates links in other notes (check a note that links to it), and the card keeps its place. A notice offers Undo for about seven seconds, and Undo renames it back.
- [ ] **New note** and **New folder** create inside the selected folder, beside a selected note, or in the vault root, with an unused "Untitled" or "New folder" suggested. The new card appears selected, even in a folder with a "+N more" list. Undo removes it, but only while it is still empty; after you type in the note it says so and leaves it.
- [ ] **Delete** asks first (or not, with Settings, Editing, Delete behaviour set to straight away), moves the note to Obsidian's trash (check your trash setting), and Undo brings a single note back with its content. A folder with more files than the threshold asks again, naming how many files it holds, and Undo for a folder says to use the trash.
- [ ] **Drag a card onto a folder:** a small ghost with the name follows the pointer and the folder under it lights green. Dropping moves it, updates links, and the folder opens to show it. Red means refused: onto the folder it is already in, onto itself or its own subfolder, onto a note, or into a folder that already has that name; a notice says why. Escape during a drag cancels it. A drag never also selects or opens the card it ended on. A short click still selects as before.
- [ ] Moving a folder with more files than the threshold asks first. Turning off "Allow drag to move" stops the drag but leaves the editing bar working.
- [ ] After the minutes set in Settings, Editing, "Lock again after" with no edits, the dashboard locks and says so (set it to 1 minute to try). 0 means never.
- [ ] The **Editing** tab in settings lists the five settings, each with a reset button, and Reset tab restores them.
- [ ] Changes made in Obsidian's file explorer while the dashboard is open still appear, and a rename made here shows in the explorer.

**Full-surface graph** (compare side by side with a Canvas tab, in a light and a dark theme)

- [ ] The graph fills the whole view below the toolbar and breadcrumb, to the bottom and both sides: no bordered box and no strip at the bottom.
- [ ] The graph colour matches an Obsidian Canvas tab exactly, with no visible seam between the toolbar, breadcrumb and graph. If it differs, open developer tools (Ctrl+Shift+I on Windows, Cmd+Option+I on Mac), select the Canvas background and look at its computed `background-color`, and the Canvas dots, and compare with `--background-primary` and `--background-modifier-border` on this view. If the theme gives Canvas its own colour (Obsidian's variables are `--canvas-background` and `--canvas-dot-pattern`), change the two lines in `src/styles.css` under `.island-tree-view .svelte-flow` to `var(--canvas-background, var(--background-primary))` and `var(--canvas-dot-pattern, var(--background-modifier-border))`.
- [ ] The dots are as faint as Canvas's and do not lighten the area. The grid colour and opacity settings still change them.
- [ ] The tree is framed to the available space when the dashboard opens.
- [ ] The zoom buttons are visible and clickable, and are not covered by the floating text.

**Bottom area** (try a wide pane, a narrow pane, and with and without a card selected)

- [ ] The three zoom buttons are a column on the left edge, 24px from the left, 8px apart with their own outlines, with the middle of the column 45% of the way down the graph (below the toolbar and breadcrumb). There is no "Svelte Flow" label anywhere. Change `--island-zoom-offset-y` in `src/styles.css` to move them.
- [ ] With a card selected, the text is bottom left, left-aligned, 24px from the left and bottom edges.
- [ ] A card with a very long name and path: the name and the path each stop at two lines with an ellipsis, the text grows upward, and it stops at least 24px below the zoom buttons. In a very short pane the top of the name is cut first, never the counts line.
- [ ] Measure in developer tools (Ctrl+Shift+I, Cmd+Option+I on Mac): with the status bar hidden, `.island-info` has 24px between its left and bottom edges and the pane (`.workspace-leaf-content`), and `.svelte-flow__controls` has 24px on the left. The view (`.view-content.island-tree-view`) has zero padding. Resize the pane taller and shorter: the button column stays centred on the same point and never goes under the toolbar or breadcrumb.
- [ ] Status bar shown: the text sits at 24px unless the bar reaches it sideways (a narrow pane, or a long line in the bottom-right pane), in which case it rises to sit about 4px above the bar. Hide the bar and it drops back to exactly 24px. The zoom buttons never move for the bar.
- [ ] The breadcrumb under the toolbar is in the interface font.

**Mind map layout**

- [ ] A **Mind map** button sits after Radial in the toolbar. Click it: the layout changes, the button turns accent-coloured and reads "Mind map: balanced". Click again: "Mind map: one-sided". Click again: back to balanced. Reopen the dashboard (or restart Obsidian) with Mind map as the layout: the last view is still chosen. Settings, Layout, shows "Mind map view", and "Default layout" has a Mind map option.
- [ ] Balanced: the vault card is in the middle of the view. The main branches are split between the right and left, not alternated: both sides are close in height, and the left side continues the order upwards (clockwise). Deeper levels go further right on the right side and further left on the left side, in neat columns, each parent level with the middle of its children.
- [ ] One-sided: the vault card is at the far left, level with the middle of the whole tree, and each level is a column to its right.
- [ ] Branches are smooth S-curves from the edge of the parent nearest the child to the edge of the child nearest the parent (right edge to left edge on the right side, left edge to right edge on the left side), with the same flowing dashed line as Vertical and Radial: the dots move away from the parent, the path to the selected card flows faster, and the dash and flow-speed settings apply. With the curve style set to Step they are rounded elbows. There are no diagonals.
- [ ] Expand folders, Expand files, Focus selected, Reset focus, Reset and search all re-lay out the mind map. "+N more" sits in the column of its siblings and works. Cards never overlap, even with a folder of many files. Switching layout or view glides the cards and frames the whole tree with a little space around it.
- [ ] The toolbar may wrap onto a second row in a narrow pane; that is expected.

**Zoom to area** (all three layouts once they exist)

- [ ] A fourth zoom button with a dashed rectangle sits below fit view, 8px from it, and the column of four stays centred on the same point. Its tooltip says "Zoom to area (or hold Shift and drag)".
- [ ] Click it: it turns accent-coloured and the cursor becomes a crosshair. Drag a rectangle: a faint accent outline and fill follow the pointer, and the graph does not pan. On release the camera glides to fit the area with a little space around it, and the button turns off.
- [ ] Drag right to left and bottom to top: same result. A drag under about 20px does nothing and box mode stays on. Escape turns box mode off without moving the camera.
- [ ] A very small area does not zoom in absurdly far (zoom stops at 1.5).
- [ ] Hold Shift (without the button) and drag: the same rectangle and zoom, with the button staying off. Typing capital letters in the search box does not trigger it. Ctrl and Cmd are not used.
- [ ] The other zoom buttons still work while box mode is on, and the details text is not blocked by the layer.
- [ ] With nothing selected nothing shows at the bottom left.

## Project conventions

- British English and sentence case in all UI text.
- Start every module with a header comment saying what it is for.
- Exported functions get a doc comment explaining why, not what.
- Every pure function gets a unit test, in a `*.test.ts` file beside it.
- Layout and model code must not import UI or `obsidian` code.
- Edit styles in `src/styles.css`, never in the generated root `styles.css`.
- Check Obsidian API names against `node_modules/obsidian/obsidian.d.ts` before using them.
- Pass `cls` as an array whenever it has more than one class and the element is an SVG one. Obsidian's `createEl` sets `className`, so a space-separated string is fine for HTML elements, but `createSvg` hands the string to `classList.add`, which throws on a space. The typings say a space-separated string is allowed; the real app does not follow them for SVG. The same goes for `addClass` and `toggleClass`: one class name per argument.
- Stand-ins for Obsidian in tests must be as strict as the real thing, or they hide bugs like the one above. The Chrome and jsdom stand-ins now copy `createEl` and `createSvg` from Obsidian's own `enhance.js` (found inside `obsidian.asar` in the install folder).
