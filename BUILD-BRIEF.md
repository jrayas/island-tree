# Build brief

Standing instructions for building the Island tree plugin. Saved verbatim from the owner's prompts so any session can pick them up. `CLAUDE.md` holds the short working rules; this file holds the full process.

## Start of every session

Read `CLAUDE.md`, `SPEC.md` and `PROGRESS.md`, then `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`. Open `reference/mockup-island-tree.html` in a browser for the intended behaviour.

## Build process

Build the plugin milestone by milestone, in the order given in `SPEC.md` section 11.

**Before each milestone:** show the owner a short plan listing the files you will create or change, and wait for approval.

**After each milestone, in the same commit as the code:**

1. Run the build and the tests, and fix any errors.
2. Update `PROGRESS.md` (what is done, open issues, next step).
3. Update `docs/ARCHITECTURE.md` so it describes what is actually built, and change the status table.
4. Add an entry to `docs/DECISIONS.md` for any significant choice made or changed.
5. Update `docs/DEVELOPMENT.md` if commands, setup or the test checklist changed, and confirm its commands against the real `package.json`.
6. Add notes to `CHANGELOG.md` under Unreleased.
7. Make a git commit with a clear message.

## Code standards

- Start every module with a short header comment saying what it is for.
- Add doc comments to exported functions that explain why rather than what.
- Write a unit test for every pure function you add.
- A new developer must be able to follow how the plugin was built from the docs alone.
- Check Obsidian API names against the installed type definitions before using them.
- Use British English and sentence case in all UI text.

## Release and community plugin requirements

The plugin must be ready for the Obsidian community plugin list and updated through GitHub releases.

- Create `manifest.json`, `versions.json`, `README.md` and a `LICENSE` file as part of milestone 1, and keep them correct.
- Add a GitHub Actions workflow in milestone 7 that builds on a version tag and attaches `main.js`, `manifest.json` and `styles.css` to a GitHub release.
- Keep the version in `manifest.json`, `package.json` and `versions.json` in step, and make the release tag match the version exactly.
- Before the first submission, check the current Obsidian community plugin guidelines and fix anything that does not comply. Tell the owner what is left to do by hand, such as creating the GitHub repository and opening the listing pull request.
