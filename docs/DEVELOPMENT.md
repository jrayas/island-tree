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
- [ ] The info panel shows the selected card's name, path and counts (folder) or type (file).
- [ ] Double click a note: it opens in a new tab. Ctrl (Cmd) with double click opens a split. Double clicking a file that was deleted after the dashboard opened shows a short notice, not an error.
- [ ] **Reset** returns to the starting view and keeps the layout you chose.
- [ ] Changing the plugin's default layout is not possible yet (settings arrive in milestone 5); the dashboard starts vertical.
- [ ] No errors in the developer console (Ctrl+Shift+I) during any of the above.

## Project conventions

- British English and sentence case in all UI text.
- Start every module with a header comment saying what it is for.
- Exported functions get a doc comment explaining why, not what.
- Every pure function gets a unit test, in a `*.test.ts` file beside it.
- Layout and model code must not import UI or `obsidian` code.
- Edit styles in `src/styles.css`, never in the generated root `styles.css`.
- Check Obsidian API names against `node_modules/obsidian/obsidian.d.ts` before using them.
