# Progress

Last updated: milestone 5 (settings).

## Done

**Milestone 1: scaffold** (commit 49d8629)

- Build, plugin shell, empty settings tab, typed settings, release files, lint, Vitest, project docs.

**Milestone 2: read-only tree** (commit a5a6941)

- Tree model with stable ids, visibility rules 1 to 3, vertical layout, cards, curved flowing branches, pan and zoom, dot grid, frame-by-frame gliding. Details in `docs/ARCHITECTURE.md`.

**Milestone 3: navigation** (commit 907dd96)

- Radial layout, Expand folders and Expand files, Reset, search as a temporary overlay, focus mode with breadcrumb, info panel, double click to focus a folder or open a file, camera re-fit on layout, focus and reset.

**Milestone 4: live updates and metadata** (commit 0c55f6a)

- Vault watching with debounce, stable ids across renames and moves, view-state tidying, file details (age, size, links, tags, status), Details toggle and semantic zoom.

**Milestone 5: settings**

- One schema table (`settings/schema.ts`) describes every setting; validation, defaults, controls, presets, resets and export come from it (D-027). Saved data is nested by group, version 2, and version 1 data is migrated.
- Settings page: header, live preview built with the real layout and styles, an accessible horizontal tab strip, and generated controls with a reset button on each row (D-026).
- Cards: size, corner radius, border, padding, text size (0 follows the theme), start-detailed, which details show, status property name. Lines and grid: curve style (curved, step, straight, in both layouts), thickness, dash, flow speed, highlight colour, grid type, size, spacing, opacity and colour. Layout: default layout, gap, level spacing, ring radius and step, list limit, start-expanded switches. Editing: in the schema and validated, no tab yet (milestone 6).
- Presets: Compact, Comfortable and Large; save, rename and delete your own; reset a tab or everything (D-030). Export and import as JSON by clipboard or file, with a summary shown before anything changes (D-031).
- Settings apply live: open dashboards restyle through CSS variables and re-lay out with a re-fit (D-032). Saving waits 300 ms after the last change and flushes on unload.
- Checks: `svelte-check` 0 errors and 0 warnings, 267 unit tests passing, lint 0 errors (one accepted warning, D-026).
- Throwaway jsdom smoke tests (kept outside the project): the settings page was driven end to end against a stand-in for Obsidian's `Setting`, `Modal` and `Notice`, covering every tab, the arrow keys, sliders, toggles, dropdowns, text, reset, all preset actions, export, a hostile import with its summary, reset tab and reset all, the delayed save, and unsubscribing on hide, with no errors. The dashboard was driven against live setting changes: card size, list limit, grid type, details switches, status property and tag switches, and the start-with options.

**UI change after milestone 5: one continuous surface** (D-034)

- The graph fills the view below the toolbar and breadcrumb in the same colour as Obsidian Canvas (`--background-primary`), with faint Canvas-like dots. The selection details are floating text instead of a strip (bottom left, 24px from the edges; the zoom buttons are a column on the left edge near the middle, 8px apart, D-035, D-038). The extra bottom gap was Obsidian's own view padding, now overridden (D-037), and the text rises only while the floating status bar actually reaches it. The on-screen Svelte Flow credit is hidden and credited in the README (D-036). The camera frames the tree as soon as the view has a size. The toolbar, cards, connectors and accent colour were not touched.

## Open issues

- **Milestones 2 to 5 have not been tried in a real Obsidian vault.** The jsdom tests use stand-ins for Obsidian and cannot measure layout, so they could not check that **branches draw**, whether the radial layout looks right, how the cards, the settings page and the preview look in your theme, how the controls feel, or how smooth the gliding is. Please run the milestone 2 to 5 checklists in `docs/DEVELOPMENT.md` and tell me what you see. If branches do not appear, the likely cause is how Svelte Flow measures the centre handles (D-012); the curve-style setting would then show nothing either.
- **Canvas colour match** is by variable, not by sight: compare with a Canvas tab as the checklist in `docs/DEVELOPMENT.md` says, and change two lines if your theme gives Canvas its own colour (D-034).
- **Settings page layout** is the part most likely to need visual fixes: the preview's scaling, the tab strip, the row spacing and the slider value labels are written but unseen.
- **Folder renames:** I am not certain whether Obsidian sends one `rename` event for a folder or one per file inside it. The code handles both (D-020).
- **Author name is a placeholder** ("Your name") in `manifest.json` and `LICENSE`.
- **Lint warning accepted:** no `getSettingDefinitions()`, so the settings are not in Obsidian 1.13's global settings search (D-026).
- **`npm audit`:** 3 moderate findings via the `obsidian` typings (D-008). Development only.
- **Svelte Flow attribution** is hidden on screen and credited in the README (D-036). Svelte Flow's typings ask people who hide it to consider a Pro subscription; this is a request, not a licence condition (MIT).
- **Spec differences:** command names (D-006), JavaScript easing instead of CSS transitions (D-010), click behaviour (D-013), search as an overlay (D-015), full rebuild instead of incremental or lazy updates (D-020), one card size and one ring radius setting instead of many (D-029). `SPEC.md` still describes the original wording.
- Removed cards vanish instead of fading out (polish, milestone 7).
- Branches use the target layout's centre, so they look slightly off for a moment while switching layouts (D-019).
- Dates are written in British format whatever the system locale.
- Changing the default layout or the "start with" settings affects the next time the dashboard opens (and Reset), not one already open.

## Next step

Milestone 6: editing (lock, rename, create, trash, drag to move, undo, auto-relock) and the Editing settings tab. A plan listing the files will be shown for approval first.
