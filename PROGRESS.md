# Progress

Last updated: milestone 4 (live updates and details).

## Done

**Milestone 1: scaffold** (commit 49d8629)

- Build, plugin shell, empty settings tab, typed settings, release files, lint, Vitest, project docs.

**Milestone 2: read-only tree** (commit a5a6941)

- Tree model with stable ids, visibility rules 1 to 3, vertical layout, cards, curved flowing branches, pan and zoom, dot grid, frame-by-frame gliding. Details in `docs/ARCHITECTURE.md`.

**Milestone 3: navigation** (commit 907dd96)

- Radial layout, Expand folders and Expand files, Reset, search as a temporary overlay, focus mode with breadcrumb, info panel, double click to focus a folder or open a file, camera re-fit on layout, focus and reset.

**Milestone 4: live updates and metadata**

- Live updates: vault `create`, `delete`, `rename`, `modify` and metadata `changed`, `resolved` are watched, held back until 150 ms of quiet, and delivered once (D-021). Creating, deleting, renaming or moving a note rebuilds the tree with stable ids, so a renamed or moved card keeps its identity and glides (D-020). The view state is tidied afterwards: deleted selection cleared, deleted focus returns to the root, new folders opened while Expand folders is on, folders closed by hand left alone (D-025). Listeners are removed when the view closes.
- File details: modified time, size, outgoing and incoming links, tags and the status property, read only for visible cards (D-022). Link index inverted once from `resolvedLinks` and cached.
- Details toggle: bigger cards, a second row with recency dot, age, size, links and a coloured status chip; folders show their item count. The camera re-frames when it is toggled (D-024). Radial rings spread by 1.3 for detailed cards.
- Semantic zoom: below 0.45 cards become a type colour and short name; the detail row shows from 0.7 (D-024). The zoom level is shared state, so zooming does not rebuild cards.
- Info panel shows modified date, size, links out and backlinks, tags and status. Tags show in the card tooltip.
- `statusProperty` setting (default `status`), with its control due in milestone 5.
- Checks: `svelte-check` 0 errors and 0 warnings, 163 unit tests passing, lint 0 errors.
- Throwaway jsdom smoke tests (kept outside the project): details rows and chips appear with Details on at a wide view and disappear at a narrow one, where cards go minimal; rename, create, delete and a new folder under Expand folders all behaved as intended, and a folder closed by hand stayed closed after a refresh; no console errors. A separate test of the watcher with a fake vault sent 400 events over about a second and got one update after they stopped, reported a rename at once, and left no listeners after stopping.

## Open issues

- **Milestones 2, 3 and 4 have not been tried in a real Obsidian vault.** The jsdom tests cannot measure layout and use a stand-in for Obsidian's `debounce`, so they could not check that **branches draw**, whether the **radial layout looks right**, how cards look in your theme, how smooth the gliding is, where the camera lands, or how the live updates feel against real file events. Please run the milestone 2, 3 and 4 checklists in `docs/DEVELOPMENT.md` and tell me what you see. If branches do not appear, the likely cause is how Svelte Flow measures the centre handles (D-012).
- **Folder renames:** I am not certain whether Obsidian sends one `rename` event for a folder or one per file inside it. The code handles both (D-020), but it has not been seen with real events.
- **Author name is a placeholder** ("Your name") in `manifest.json` and `LICENSE`.
- **Lint warning:** the settings tab does not use the declarative `getSettingDefinitions()` API (D-007, decide in milestone 5).
- **`npm audit`:** 3 moderate findings via the `obsidian` typings (D-008). Development only.
- **Svelte Flow attribution** (a small "Svelte Flow" link, bottom right) is kept on. Say if you want it hidden.
- **Spec differences:** command names (D-006), JavaScript easing instead of CSS transitions (D-010), click behaviour (D-013), search as an overlay (D-015), full rebuild instead of incremental or lazy updates (D-020). `SPEC.md` still describes the original wording.
- The default layout and the status property name cannot be changed until milestone 5.
- Removed cards vanish instead of fading out (polish, milestone 7).
- Branches use the target layout's centre, so they look slightly off for a moment while switching layouts (D-019).
- Dates are written in British format whatever the system locale.

## Next step

Milestone 5: settings (tab strip, all controls, CSS variables, live preview, presets, import and export with validation). A plan listing the files will be shown for approval first.
