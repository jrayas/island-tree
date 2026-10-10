# Releasing and submitting Island tree

What the maintainer does, in order. Claude Code cannot do the steps marked **by hand** (they need your accounts). The rules were read from the Obsidian developer docs on 2026-10-11; check the live pages before you submit, because the process has changed before:

- Submit your plugin: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Developer policies: https://docs.obsidian.md/Developer+policies

## Before anything: the two blockers

`npm run check:release` currently reports two errors, and it will keep failing until you fix them:

1. **By hand:** put your real name in `manifest.json` ("author", and optionally "authorUrl" and "fundingUrl") and in `LICENSE` (the copyright line). Both still say "Your name".
2. The repository must exist on GitHub (step 1 below), because the release workflow and the directory both read it.

## The steps

1. **By hand: create the GitHub repository and push this project.** Make it public. The folder already has `.github/workflows/ci.yml` (lint, tests, build and the rules check on every push) and `release.yml` (builds and publishes a release when you push a version tag). Check the **Actions** tab shows CI passing on the first push. CI has not been run yet, so expect to fix a small thing or two (for example a Node version).
2. **By hand: try it in Obsidian.** Work through the checklists in `docs/DEVELOPMENT.md`, in a copy of a real vault for editing, and with the two throwaway big vaults for the performance pass (`scripts/synthetic-vault.mjs`). Nothing has run in Obsidian beyond the first look at the settings page.
3. **By hand: take the README screenshots** in Obsidian, save them in `docs/images/` and add them where the README has a Screenshots placeholder.
4. **Decide the version.** The project is at `0.1.0`. For a first public release `1.0.0` is the usual choice. Run `npm version 1.0.0`: it updates `package.json`, `manifest.json` and `versions.json` together (through `version-bump.mjs`) and makes a git commit and a tag. **Use the tag it makes, with no "v" in front.**
5. **Check:** `npm run lint`, `npm test`, `npm run build` and `npm run check:release -- --built` should all pass.
6. **By hand: push the tag.** `git push origin main --follow-tags`. The Release workflow builds the plugin, checks the tag equals the manifest version, and creates a GitHub release with `main.js`, `manifest.json` and `styles.css` attached as separate files. Open the release page and confirm all three are there and the tag is exactly the version.
7. **By hand: submit to the directory.** As of 2026-10-11 the docs say: sign in at https://community.obsidian.md with your Obsidian account, link your GitHub account (so ownership of the repository can be verified), then use **Add your plugin**. The directory reads `manifest.json` from the default branch, so commit it first. The plugin id must be unique and must not contain "obsidian" (`island-tree` is fine). The older route was a pull request that added an entry to `community-plugins.json` in `obsidianmd/obsidian-releases`; the docs no longer describe it, but that repository's README still mentions the file, so read the live submission page and follow whatever it says.
8. **Respond to review.** Review starts automatically. If it reports errors, fix them, publish a new release with a higher version (a new tag), and the directory re-checks. The plugin cannot be installed from inside Obsidian until the automated errors are fixed.

## What the review looks at (and where Island tree stands)

| Rule | Status |
|---|---|
| `manifest.json` fields, id without "obsidian", description under 250 characters ending in a full stop | Checked by the script. Author is a placeholder until you change it. |
| `README.md` and `LICENSE` at the repository root | Present. Add screenshots. |
| Release tag equals the manifest version, with `main.js` and `manifest.json` attached (`styles.css` optional) | Done by the Release workflow. |
| No `innerHTML`, `outerHTML` or `insertAdjacentHTML` | Checked by the script and the lint rules. None used. |
| Use `this.app`, not the global `app` | Checked. |
| No default hotkeys | Checked. None set. |
| Command names without the plugin name | "Open dashboard", "Open dashboard in sidebar", "Toggle lock". |
| Sentence case in UI text, no "settings" in headings | Followed. See the note below about the settings header card. |
| Clean up on unload (`registerEvent`, unmounting, timers) | Audited, see `docs/ARCHITECTURE.md`. Not detaching leaves in `onunload`. |
| `normalizePath()` for constructed paths | Used for every path passed to Obsidian when editing. |
| No inline styles that fight themes; Obsidian CSS variables | Colours come from Obsidian variables. A few inline styles set positions or a file type's colour, which a CSS class cannot express. |
| No network calls, no telemetry; disclosed in the README | None; stated in the README under Privacy. |
| Mobile | Desktop only (`isDesktopOnly: true`). |

**One thing a reviewer may question:** the guidelines say not to add a top-level heading with the plugin name in the settings tab. Island tree's settings page opens with a header card showing the name and a one-line description. It is a styled block, not a heading element, and the lint rule for settings headings passes, but if review objects, remove the title line from the card (`src/settings/SettingsTab.ts`).

## The maintainer's prompt

`docs/PUBLISH-PROMPT.md` holds the prompt you wrote for working through publishing with Claude Code, adjusted for the current process and with the fork-and-clone step removed. Use it after the project is on GitHub.
