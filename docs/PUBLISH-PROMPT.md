# Prompt for publishing Island tree with Claude Code

Paste the block below into Claude Code **after the project is on GitHub and you have tried it in Obsidian** (see `docs/SUBMISSION.md`). It is the owner's own prompt, kept in the owner's words, with these changes:

- **Plugin details are filled in.** Only your GitHub user name is left for you to fill in.
- **Phase 4 no longer forks or clones anything.** Your instruction was not to fork or clone a repository, so Claude prepares the submission text and you submit it yourself. It also reflects the current process: the Obsidian docs (read 2026-10-11) now say to submit through the plugin directory at community.obsidian.md, not by a pull request to `obsidianmd/obsidian-releases`. Claude is told to read the live page first, because that process has changed before.
- **The repository already has** `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/check-guidelines.mjs` (run with `npm run check:release`), unit tests, a performance test and manual checklists in `docs/DEVELOPMENT.md`. Phases 1 to 3 are told to use them, and to check the workflows, not write new ones.
- **Phase 1 notes the known items** so they are not rediscovered as surprises.

Everything else is unchanged, including: ask before editing code, show a diff or summary first, never push, tag, release or submit without explicit approval at that step, and British English.

---

```
You are helping me publish my Obsidian community plugin. Work through the phases below in order. Ask me before you edit or write any code, and show me a diff or summary of each change first. Never push, tag, release or submit anything without my explicit approval at that step. Never fork or clone any repository. Use British English.

PLUGIN DETAILS
- Repo: [github-username]/island-tree
- Plugin name: Island tree
- Plugin id: island-tree
- Minimum Obsidian version I want to support: 1.13.0
- Platforms: desktop only

PHASE 1: Repo audit (read-only, change nothing)
1. Read manifest.json, package.json, versions.json, README.md, LICENSE, .gitignore, tsconfig, the bundler config (esbuild) and the main source files. Also read docs/SUBMISSION.md and docs/DECISIONS.md, which explain choices already made.
2. Run `npm run check:release -- --built` (after a build) and report everything it says. Then check manifest.json yourself:
   - Required fields: id, name, version (semver), minAppVersion, description, author, isDesktopOnly.
   - The id contains no "obsidian", is lowercase with no spaces, and matches the plugin folder name.
   - The description is under 250 characters, starts with a capital letter, ends with a full stop, and does not say "Obsidian" or "plugin".
   - minAppVersion is realistic for the APIs I use.
   - versions.json maps the current version to minAppVersion.
3. Check the repo root has a README.md (what it does, how to install, how to use, settings, screenshots if useful) and a LICENSE.
4. Check package.json has a working build script and that the build produces main.js (plus styles.css) at the repo root.
5. Review the source against the Obsidian plugin guidelines (read https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines now, not from memory) and report any of the following:
   - innerHTML, outerHTML or insertAdjacentHTML with unsanitised input (use DOM helpers like createEl / createDiv)
   - Global app access (use this.app, not window.app)
   - Listeners, intervals or events not registered through this.registerEvent, this.registerDomEvent or this.registerInterval, or not removed on unload, which would leak
   - Missing cleanup in onunload
   - Direct file edits that should use app.vault.process or the Vault API
   - Use of Node or Electron APIs when isDesktopOnly is false
   - Network requests, telemetry or ads that are not clearly disclosed in the README
   - Hard-coded styles that ignore themes (use Obsidian CSS variables)
   - Command ids or names that include the plugin id or name
   - Default hotkeys set on commands
   - Leftover console.log calls, TODOs, or sample-plugin boilerplate such as "Sample Plugin" or "MyPlugin"
   - Settings tab headings that include the word "settings" or the plugin name (note: the settings page opens with a styled header card showing the plugin name; say whether you think a reviewer would object)
   - Deprecated APIs
   Known and already decided, so do not report them as new: the one lint warning about getSettingDefinitions (docs/DECISIONS.md D-026); a few inline styles that set a position or a file type's colour; the settings header card.
6. Output a prioritised report: Blockers (will be rejected), Should fix, and Nice to have. Cite file and line for each item. Then stop and wait for me.

PHASE 2: Bug-hunting and testing
1. Run the install, type-check, lint and build, and report every error or warning.
2. Run the existing unit tests (npm test) and report the result. Do not write new tests without asking me first; propose any gaps (pure logic such as parsers, formatters and data transforms are already covered) and list the manual tests I need to run in Obsidian.
3. Do a static review for common bugs: null and undefined handling, async/await mistakes, race conditions, error handling around file I/O, edge cases (empty vault, empty note, very large notes, special characters, non-English text, notes in nested folders, renamed or deleted files), settings migration when settings are missing or new fields are added, and behaviour on plugin disable and re-enable.
4. Produce a manual test checklist for me, built from docs/DEVELOPMENT.md and covering:
   - Fresh install into a clean test vault (copy main.js, manifest.json and styles.css into .obsidian/plugins/island-tree/)
   - Enable, disable and re-enable with no console errors
   - Every command, every setting and every UI element
   - Light and dark themes, plus one popular community theme
   - Reload without restarting (Ctrl/Cmd+R)
   - Large vault performance, using scripts/synthetic-vault.mjs and docs/PERFORMANCE.md
   - Interaction with a few popular plugins
5. Tell me which Developer Console checks to do (Ctrl+Shift+I on Windows, Cmd+Option+I on Mac).
6. After my approval, apply fixes one at a time, re-run the build and tests after each, and summarise what changed.

PHASE 3: Release preparation
1. Confirm the version in manifest.json, package.json and versions.json is consistent. Propose the release version (suggest 1.0.0 for a first release).
2. Verify the git tag will exactly match the manifest version with no "v" prefix.
3. Check the existing GitHub Actions workflows (.github/workflows/ci.yml and release.yml): that on a tag push they build the plugin and create a release with main.js, manifest.json and styles.css attached as individual assets. Report problems; do not rewrite them without asking me.
4. After my approval, run the production build, verify the three release files exist, and list their sizes.
5. After my explicit approval, commit and tag (using `npm version`, which also updates the three version files), then I will push; or push if I tell you to. Then verify the release page shows the correct assets and tag, using gh.

PHASE 4: Submission (nothing is forked or cloned)
1. Read the live page https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin and any pages it links to for the requirements, and tell me whether it still says to submit through the plugin directory at community.obsidian.md, or has changed back to a pull request to obsidianmd/obsidian-releases. Do not rely on memory: this has changed before.
2. Tell me exactly what I must do by hand in the browser (signing in with my Obsidian account, linking my GitHub account, adding the plugin), and prepare anything I need to paste: the repository URL, and a short description that matches manifest.json exactly (id, name, author, description).
3. If the live page says a pull request is needed after all, do NOT fork or clone. Prepare the exact JSON entry for community-plugins.json ({ "id": "...", "name": "...", "author": "...", "description": "...", "repo": "username/repo" }, matching manifest.json exactly), the pull request title ("Add plugin: Island tree") and a body that fills in every checklist item honestly, ticking only items you have verified, and let me submit it myself in the browser.
4. After I have submitted, help me read the automated review results and tell me what to fix. Do not close, force-push or reopen anything without asking.

PHASE 5: Final report
Give me a concise summary: what passed, what I fixed, remaining risks, the release link, the submission status, and what to expect during review (an automated check, then possibly a manual review by the Obsidian team, which can take days to weeks). Also remind me to reply to reviewer comments promptly and to publish a new release with a higher version for each fix.

Before you begin, check that gh is installed and authenticated (gh auth status) and tell me if anything is missing. Do not start Phase 1 until you have confirmed the plugin details above with me, including my GitHub user name.
```
