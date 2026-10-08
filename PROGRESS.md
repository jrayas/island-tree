# Progress

Last updated: milestone 2 (read-only tree).

## Done

**Milestone 1: scaffold** (commit 49d8629)

- Build, plugin shell, empty settings tab, typed settings, release files, lint, Vitest, project docs.

**Milestone 2: read-only tree**

- Model: stable node ids, folders-first natural sorting, visibility rules 1 to 3 (open folders, subfolders first, files on request, "+N more" pill), view state transitions, file type colours and icons, card text. All pure and unit tested.
- Layout: vertical tidy tree, branch curve, frame-rate independent easing with new cards growing out of their parent. All pure and unit tested.
- UI: Svelte Flow canvas with pan, zoom, dot grid and zoom controls; cards (folder, file, pill); curved dashed branches with the path to the selected card highlighted; click rules as described in `docs/ARCHITECTURE.md`.
- Build: `styles.css` is now generated from `src/styles.css` plus Svelte Flow's stylesheet (D-009).
- Checks: `svelte-check` 0 errors and 0 warnings, 68 unit tests passing, lint 0 errors.
- A throwaway jsdom smoke test (kept outside the project) mounted the app, and confirmed that the right cards appear and that folder, badge and "+N more" clicks change what is shown, with no runtime errors.

## Open issues

- **Not tried in a real Obsidian vault yet.** The jsdom test cannot measure layout, so it could not check that **branches draw**, how the cards look in your theme, or how smooth the gliding is. Please run the milestone 2 checklist in `docs/DEVELOPMENT.md` and tell me what you see. If branches do not appear, the likely cause is how Svelte Flow measures the centre handles (D-012).
- **Author name is a placeholder** ("Your name") in `manifest.json` and `LICENSE`.
- **Lint warning:** the settings tab does not use the declarative `getSettingDefinitions()` API (D-007, decide in milestone 5).
- **`npm audit`:** 3 moderate findings via the `obsidian` typings (D-008). Development only.
- **Svelte Flow attribution** (a small "Svelte Flow" link, bottom right) is kept on. Hiding it is allowed for open-source use but the authors ask for it to be kept; say if you want it hidden.
- **Spec differences:** command names (D-006), JavaScript easing instead of CSS transitions (D-010), click behaviour (D-013). `SPEC.md` still describes the original wording.
- Removed cards vanish instead of fading out (polish, milestone 7).
- The tree does not update when files change until milestone 4.

## Next step

Milestone 3: radial layout, focus mode, search, the Expand folders and Expand files toggles, breadcrumb and info panel. A plan listing the files will be shown for approval first.
