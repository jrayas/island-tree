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
- [ ] A dotted grid shows behind the cards. Dragging the background pans and scrolling zooms. The zoom buttons and fit button (bottom left) work.
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
- [ ] Selecting a card fades in plain text at the bottom right, right-aligned and clear of the status bar: the name in bold, the path in smaller muted text and one quiet line (folder counts, or the file's type and details). Selecting nothing fades it out. It has no box and never blocks dragging or clicking.
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

**Full-surface graph** (compare side by side with a Canvas tab, in a light and a dark theme)

- [ ] The graph fills the whole view below the toolbar and breadcrumb, to the bottom and both sides: no bordered box and no strip at the bottom.
- [ ] The graph colour matches an Obsidian Canvas tab exactly, with no visible seam between the toolbar, breadcrumb and graph. If it differs, open developer tools (Ctrl+Shift+I on Windows, Cmd+Option+I on Mac), select the Canvas background and look at its computed `background-color`, and the Canvas dots, and compare with `--background-primary` and `--background-modifier-border` on this view. If the theme gives Canvas its own colour (Obsidian's variables are `--canvas-background` and `--canvas-dot-pattern`), change the two lines in `src/styles.css` under `.island-tree-view .svelte-flow` to `var(--canvas-background, var(--background-primary))` and `var(--canvas-dot-pattern, var(--background-modifier-border))`.
- [ ] The dots are as faint as Canvas's and do not lighten the area. The grid colour and opacity settings still change them.
- [ ] The tree is framed to the available space when the dashboard opens.
- [ ] The zoom buttons are visible and clickable, and are not covered by the floating text.

**Bottom area** (try a wide pane, a narrow pane, and with and without a card selected)

- [ ] The three zoom buttons are bottom left, 8px apart, with their own outlines, about 18px from the left edge and clearly above the "Svelte Flow" credit.
- [ ] The credit is bottom left under the buttons, in a faint theme colour, and never touches them at any pane size.
- [ ] With a card selected, the text is bottom right, right-aligned, above Obsidian's status bar.
- [ ] In a narrow pane the text wraps (long paths break) and stops before the zoom buttons instead of overlapping them.
- [ ] With nothing selected nothing shows at the bottom right.

## Project conventions

- British English and sentence case in all UI text.
- Start every module with a header comment saying what it is for.
- Exported functions get a doc comment explaining why, not what.
- Every pure function gets a unit test, in a `*.test.ts` file beside it.
- Layout and model code must not import UI or `obsidian` code.
- Edit styles in `src/styles.css`, never in the generated root `styles.css`.
- Check Obsidian API names against `node_modules/obsidian/obsidian.d.ts` before using them.
