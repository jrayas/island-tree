# Progress

Last updated: milestone 1 (scaffold).

## Done

**Milestone 1: scaffold**

- Build: esbuild bundles `src/main.ts` and Svelte components into `main.js`. `npm run build` type-checks first with `svelte-check`.
- Plugin: registers the view, a ribbon icon, two commands (open in a tab, open in the sidebar) and an empty settings tab. Reopening reuses the existing leaf.
- Settings: typed object with a `version` field, defaults, `clampNumber` helper.
- Tests: Vitest, 4 passing (`clampNumber`).
- Lint: ESLint with the Obsidian community plugin rules, 0 errors.
- Release files: `manifest.json`, `versions.json`, `version-bump.mjs`, `README.md`, `LICENSE`.
- Docs: architecture, decisions, development guide, changelog, build brief.

## Open issues

- **Not tried in a real Obsidian vault yet.** Build, type-check, tests and lint pass, but the view has not been opened in Obsidian from this environment. Follow the checklist in `docs/DEVELOPMENT.md`.
- **Author name is a placeholder** ("Your name") in `manifest.json` and `LICENSE`. Needs your real name, and optionally `authorUrl` and `fundingUrl`.
- **Lint warning:** the settings tab does not use the new declarative `getSettingDefinitions()` API (Obsidian 1.13+). Decide in milestone 5; see `docs/DECISIONS.md`.
- **`npm audit`** reports 3 moderate findings, all through `moment`, a dependency of the `obsidian` typings package. Development only; nothing is shipped in `main.js`.
- `SPEC.md` still names the commands "Open Island tree"; the shipped names are "Open dashboard" (see `docs/DECISIONS.md`, D-006).

## Next step

Milestone 2: read-only tree. Tree model, visibility rules, vertical layout, cards, curved edges, pan and zoom, dot grid. A plan listing the files will be shown for approval first.
