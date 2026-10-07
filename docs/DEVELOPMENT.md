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
| `npm run dev` | Bundles to `main.js` with inline source maps and rebuilds on every change. |
| `npm run build` | Type-checks with `svelte-check`, then makes a minified production `main.js`. |
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

   Alternatively copy `main.js`, `manifest.json` and `styles.css` into `<test vault>\.obsidian\plugins\island-tree\` after each build.
3. In Obsidian, open **Settings → Community plugins**, turn off restricted mode, and enable **Island tree**.
4. Run `npm run dev` and leave it running. Reload after a rebuild with the command **Reload app without saving**, or disable and re-enable the plugin.
5. Optional: install the community "Hot Reload" plugin in the test vault and create an empty file named `.hotreload` in this project folder. It then reloads the plugin whenever `main.js` changes. (`.hotreload` is git-ignored.)

## Test checklist

Run through this by hand before each commit that changes behaviour. Tick items off in `PROGRESS.md` when a milestone is finished.

**Milestone 1**

- [ ] `npm run build`, `npm test` and `npm run lint` finish with no errors.
- [ ] The plugin enables without errors in the developer console (Ctrl+Shift+I).
- [ ] The ribbon icon opens the empty view in a main tab.
- [ ] **Open dashboard** and **Open dashboard in sidebar** both work from the command palette.
- [ ] Running a command again focuses the existing view instead of opening a second one.
- [ ] The settings page shows an Island tree entry with placeholder text.
- [ ] Disabling the plugin closes the view and leaves no console errors.
- [ ] No hotkey is assigned to either command by default.

## Project conventions

- British English and sentence case in all UI text.
- Start every module with a header comment saying what it is for.
- Exported functions get a doc comment explaining why, not what.
- Every pure function gets a unit test, in a `*.test.ts` file beside it.
- Layout and model code must not import UI or `obsidian` code.
- Check Obsidian API names against `node_modules/obsidian/obsidian.d.ts` before using them.
