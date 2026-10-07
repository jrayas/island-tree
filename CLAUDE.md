# Island tree

Obsidian plugin that shows the vault's folders and files as an animated, canvas-style dashboard (vertical and radial layouts, dot grid, lock-protected editing, tabbed settings).

Read `SPEC.md` first. It holds the agreed decisions, data model, layout rules, editing rules, settings tabs, milestones and the community-plugin checklist. `reference/mockup-island-tree.html` is the behavioural reference; open it in a browser.

## Working rules

- Language: British English in all user-facing text, sentence case for UI strings.
- Ask the owner before writing code for a new milestone, and tell them which files you plan to create or change.
- Stack: TypeScript, esbuild, Svelte, Svelte Flow. Desktop only for v1.
- Verify Obsidian API names against the installed `obsidian` type definitions and the current developer docs before using them. Do not rely on undocumented APIs.
- Editing goes through Obsidian's own file APIs so links update and the trash setting is respected. The dashboard starts locked.
- Keep layout code pure (no UI imports) so it can be unit tested.
- Follow milestone order in `SPEC.md` section 11. Start with milestone 1, the scaffold.
