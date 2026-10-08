# Progress

Last updated: milestone 3 (navigation).

## Done

**Milestone 1: scaffold** (commit 49d8629)

- Build, plugin shell, empty settings tab, typed settings, release files, lint, Vitest, project docs.

**Milestone 2: read-only tree** (commit a5a6941)

- Tree model with stable ids, visibility rules 1 to 3, vertical layout, cards, curved flowing branches, pan and zoom, dot grid, frame-by-frame gliding. Details in `docs/ARCHITECTURE.md`.

**Milestone 3: navigation**

- Radial layout (rings, angle by visible leaf count, start straight up) and a layout switch. Radial cards are smaller; branches curve around the centre.
- Expand folders and Expand files toggles (rules 4 and 5), Reset, and the view state that backs them.
- Name search as a temporary overlay (rule 7): path to each match opens, matches get a ring, other cards fade, clearing restores the view (D-015).
- Focus mode: double click a folder, Focus selected, Reset focus, and a clickable breadcrumb.
- Info panel for the selected card (path, kind, counts).
- Double click a file to open it in a new tab, or a split with Ctrl or Cmd.
- The camera re-frames on layout, focus and reset (D-016).
- Checks: `svelte-check` 0 errors and 0 warnings, 118 unit tests passing, lint 0 errors.
- The throwaway jsdom smoke test (kept outside the project) mounted the app and drove every control: layout switch, both Expand toggles, search and clear, focus by double click, breadcrumb, split open with Ctrl, Reset. All gave the expected cards, and the console showed no errors.

## Open issues

- **Milestones 2 and 3 have not been tried in a real Obsidian vault.** The jsdom test cannot measure layout, so it could not check that **branches draw**, whether the **radial layout looks right and cards do not overlap**, how the cards look in your theme, how smooth the gliding is, or where the camera lands after a re-fit. Please run the milestone 2 and 3 checklists in `docs/DEVELOPMENT.md` and tell me what you see. If branches do not appear, the likely cause is how Svelte Flow measures the centre handles (D-012).
- **Author name is a placeholder** ("Your name") in `manifest.json` and `LICENSE`.
- **Lint warning:** the settings tab does not use the declarative `getSettingDefinitions()` API (D-007, decide in milestone 5).
- **`npm audit`:** 3 moderate findings via the `obsidian` typings (D-008). Development only.
- **Svelte Flow attribution** (a small "Svelte Flow" link, bottom right) is kept on. Say if you want it hidden.
- **Spec differences:** command names (D-006), JavaScript easing instead of CSS transitions (D-010), click behaviour (D-013), search as an overlay (D-015). `SPEC.md` still describes the original wording.
- The default layout from the settings is wired in but cannot be changed until milestone 5.
- Removed cards vanish instead of fading out (polish, milestone 7).
- The tree does not update when files change until milestone 4, so a file deleted while the dashboard is open still shows (opening it gives a notice).
- Branches use the target layout's centre, so they look slightly off for a moment while switching layouts (D-019).

## Next step

Milestone 4: live updates and metadata (vault events, link counts, tags, status, recency dot, detailed cards, semantic zoom). A plan listing the files will be shown for approval first.
