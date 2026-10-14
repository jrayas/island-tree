# Island tree: build spec for Claude Code

Working name: **Island tree** (plugin id `island-tree`, to be confirmed).
Status: built through milestone 7 (see the section "Where the build differs from this spec" below). Reference mockup: `reference/mockup-island-tree.html` (open it in a browser).

## Where the build differs from this spec

The sections below are the original design and are kept as written. This is what changed while building, each with its reason in `docs/DECISIONS.md`. Where the two disagree, this list and the decisions win. Last checked 2026-10-11.

- **Name and commands.** The id is `island-tree`. The commands are "Open dashboard", "Open dashboard in sidebar" and "Toggle lock", because the guidelines say a command name should not repeat the plugin name. No default hotkeys.
- **Three layouts, not two.** A mind map layout (balanced or one-sided) was added (D-036 to D-038).
- **Mouse like Obsidian's Canvas.** Scroll pans, Ctrl or Cmd and scroll zooms, Space and drag pans, Shift and 1 fits; a "Mouse wheel" setting swaps pan and zoom. Also a zoom-to-area tool and a **Compact** density switch (D-043, D-044).
- **Close-up.** A magnifier button below the play button glides to a reading-sized view (full size zoomed out three clicks of the zoom button, about 58%) centred on the selected card, or on the middle of the pane when nothing is selected (D-057, which replaced D-054's Saved view).
- **Auto-scroll.** The view can drift over the cards on its own, started and paused with Shift and Space, pointed with Shift and an arrow key, with direction, speed, end behaviour and start-on-open in the Layout tab (D-053).
- **"+N more" reveals a batch** of the List limit (default 40, not 6), up to 1,000 children in one folder, with at most 1,500 cards drawn at once. **Expand folders** opens one level per press. Folder counts are cached by path, and vault changes arrive as one update after 250 ms (D-046, D-048 to D-050).
- **Search suggests, and loads one card.** Typing lists the best 8 folders (best first, matched letters picked out, with their path), like Obsidian's quick switcher. Enter, or a click, goes to one: its folders open and it alone is loaded, selected and highlighted, while the rest of its list stays behind "+N more". Files are only found when Files is on, matched by name like folders. While typing, only the cards already on screen are marked, and may fade (a setting). This replaces the earlier search that revealed every match (D-056; D-051 and D-045 before it).
- **Opening notes.** A setting chooses new tab (default), this tab (so Back returns to the dashboard) or split. The dashboard remembers how it was left, also across a restart (D-045). This answers open question 4 below.
- **Keyboard and screen readers.** The dashboard is a tree with arrow-key navigation (D-047).
- **Editing.** Undo for a deleted folder is not offered (it points to Obsidian's trash). A deleted note comes back as a new file from its saved content (D-041).
- **Settings tabs.** Five tabs: Cards, Lines and grid (Lines and Canvas merged, as section 9 allows), Layout, Editing and Presets.
- **Submission.** The docs now describe submitting through the plugin directory at community.obsidian.md, not a pull request to `obsidianmd/obsidian-releases`. See `docs/SUBMISSION.md`.

## 1. Goal

An Obsidian plugin that shows the vault's folder and file structure as a live, animated, canvas-style dashboard:

- Rounded "island" cards joined by curved branches with a flowing-dash animation.
- Two layouts: **vertical** (top to bottom) and **radial** (rings around the vault root).
- Dotted grid background like Obsidian Canvas, pan and zoom.
- Updates by itself when files change.
- Optional editing (rename, create, delete, drag to move) behind a **lock**.
- Full control in a settings page (a page per tab, searchable from Obsidian's settings search), presets, and import and export.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Opens in | Main tab, right sidebar, ribbon icon and command palette entry |
| Distribution | Community-plugin ready (README, licence, release workflow, submission checks) |
| Platform for v1 | Desktop (`isDesktopOnly: true`). Use pointer events so touch can be added later |
| Language | TypeScript, bundled with esbuild |
| UI | Svelte for the view and settings UI |
| Graph rendering | Svelte Flow (`@xyflow/svelte`) for pan, zoom, custom nodes and edges. Layout code is our own (see section 5) |
| File click | Single click selects. Double click opens in a new tab. Ctrl or Cmd with double click opens in a split. Double click on a folder focuses it |
| Card info | File type colour, link counts, tags and status, modified date and size. Each item switchable in settings |
| Editing | View only, basic actions, and drag and drop moving are all built. A **lock** switches editing off. Default is locked |
| UI text | British English, sentence case |

If Svelte Flow turns out to fight the animated position changes or the radial layout, fall back to our own SVG and DOM renderer. The mockup already shows that approach working.

## 3. Suggested project structure

```
island-tree/
  manifest.json
  versions.json
  package.json
  tsconfig.json
  esbuild.config.mjs
  styles.css
  README.md
  LICENSE
  .github/workflows/release.yml
  src/
    main.ts                 plugin entry: register view, ribbon, commands, settings tab
    view.ts                 ItemView that mounts the Svelte app
    settings/
      defaults.ts           default values, ranges, validation (clamp)
      store.ts              Svelte store synced to plugin data
      SettingsTab.ts        PluginSettingTab with horizontal tab strip
      tabs/                 Cards, Lines, Canvas, Layout, Editing, Presets
      presets.ts            built-in presets, save, import and export
    model/
      tree.ts               build tree from the vault, uid per node, parent links
      visibility.ts         which children are visible (folders, files, limit, +N more)
      meta.ts               modified date, size, link counts, tags, status
    layout/
      vertical.ts           tidy top-to-bottom layout
      radial.ts             ring layout, angle share by leaf weight
    ui/
      App.svelte
      Toolbar.svelte
      Canvas.svelte         Svelte Flow wrapper, dot grid, semantic zoom
      IslandNode.svelte     card (compact and detailed)
      BranchEdge.svelte     curved edge, animated dashes, highlight
      Breadcrumb.svelte
      InfoPanel.svelte
      Toast.svelte          messages with Undo
    actions/
      history.ts            undo stack
      edit.ts               rename, create, trash, move (through Obsidian APIs)
      open.ts               open file in tab or split
  reference/
    mockup-island-tree.html
```

## 4. Data model

- Build a tree of nodes from `vault.getRoot()` (TFolder and TFile). Each node gets a **stable uid** at creation. Use the uid (not the path) as the key for open or closed state, selection, and element identity. Paths change when files move, uids do not, which is what lets cards glide to their new parent.
- Node fields: `uid`, `kind` (folder or file), `name`, `parent`, `children`, plus `meta` for files (mtime, size, outgoing links, backlinks, tags, status).
- Pseudo node for "+N more": created per folder, never stored in the vault.
- View state (separate from the tree): `open` set, `showAll` set (folders whose overflow is expanded), `filesFor` set (folders whose files are forced visible), `foldersOn` and `filesOn` toggles, `focusRoot`, `selected`, `query`, `layoutMode`, `detail`, `locked`.

### Visibility rules (copy the mockup)

1. A folder shows its children only if its uid is in `open`.
2. Subfolders are always listed first. Files are listed only if `filesOn` is true or the folder is in `filesFor`.
3. If the visible list is longer than `LIMIT` (default 6) and the folder is not in `showAll`, show the first `LIMIT` plus one "+N more" pill. Clicking the pill adds the folder to `showAll`.
4. **Expand folders** toggle: on adds every folder to `open`. Off clears `open` back to the root and resets focus.
5. **Expand files** toggle: on shows files in every open folder. Off hides them and clears `filesFor`. It only works while focused on a folder (greyed from the whole vault, ignored there, and turned off when the focus returns to the root), so a big vault is never asked to list the files of every folder at once. A folder's own Show files badge works anywhere.
6. Manual clicks always win over the toggles. The badge on a folder (subfolders · files) is clickable and toggles `filesFor` for that folder only.
7. Search: matching names highlight, their ancestors open, the parent folders of matches go into `filesFor` and `showAll`, non-matching cards fade to about 30 percent.

## 5. Layout engines

Both layouts are pure functions: `(root, visibilityRules, sizes) -> Map<uid, {x, y}>`. Keep them free of UI code so they can be unit tested.

**Vertical.** Subtree width is the sum of child subtree widths plus gaps (minimum one card width). Parent is centred above its children. Level `d` sits at `y = d * (cardHeight + levelGap)`.

**Radial.** The focus root is at the centre. Each node gets an angular span proportional to the number of visible leaves beneath it. A node sits at the middle angle of its span, on ring `d` with radius `ringRadius(d)`. Starting angle is straight up. Ring radius grows by a fixed step beyond the configured rings, and all radii scale up when detailed cards are on (mockup uses 1.3). Edges are cubic curves whose control points sit on the mid radius at the parent angle and the child angle, so branches fan out smoothly.

**Animation.** When a layout changes, cards move to their new positions with easing (mockup uses about 20 percent per frame; in production use CSS transitions on node transforms or a small tween helper). New cards start at their parent's position and fade in. Removed cards fade out while moving to their parent. Edges are recomputed from the current animated positions so they stay attached.

**Scaling.** Fit the layout to the available width, with a minimum scale (about 0.5 compact, 0.7 detailed). Beyond that, let the canvas pan.

## 6. Cards and edges

- **Compact card:** icon, name, and for folders the badge (subfolders · files).
- **Detailed card:** second row with recency dot (green today, amber within 7 days, grey older), age, size, link count, and a coloured status chip. Tags appear in the tooltip and the info panel.
- **File type colours:** Markdown accent, code and data (ts, js, json, css) purple, images (png, jpg, svg) green, PDF red, canvas amber. Use Obsidian theme variables, not hard-coded hex, so light and dark themes both work.
- **Semantic zoom:** at low zoom show only the type colour and a short name, at higher zoom switch to detail.
- **Edges:** dashed, slowly flowing. The path from the selected node back to the root is highlighted (accent colour, faster flow). Respect `prefers-reduced-motion`.
- **Canvas background:** dot grid by default (size, spacing, opacity and colour from settings). Dots move and scale with pan and zoom.

## 7. Obsidian integration

Verify every API below against the current Obsidian developer documentation and the installed `obsidian` type definitions before relying on it.

- `registerView` with an `ItemView` subclass. Open in a main-tab leaf (`workspace.getLeaf('tab')`) or the right sidebar (`workspace.getRightLeaf(false)`). Reveal an existing leaf instead of opening duplicates.
- `addRibbonIcon` and `addCommand` ("Open Island tree", "Open Island tree in sidebar", "Toggle lock"). No default hotkeys (community guideline).
- **Live updates:** `registerEvent` on `vault.on('create' | 'delete' | 'rename' | 'modify')` and `metadataCache.on('changed' | 'resolved')`. Debounce rebuilds (about 150 ms) and update the tree incrementally where possible, so a full re-layout is not needed for every keystroke.
- **Link counts:** compute from `metadataCache.resolvedLinks` (outgoing, and incoming by inverting the map once and caching it). Do not rely on undocumented backlink helpers.
- **Tags and status:** `metadataCache.getFileCache(file)`, frontmatter plus inline tags. The frontmatter key used for status is a setting (default `status`).
- **Opening files:** `leaf.openFile(file)` for a new tab or split. Respect Obsidian's own "open in new tab" behaviour where sensible.
- **Large vaults:** lazy-build children for collapsed folders, render only visible nodes, and keep per-node work small. Test with a synthetic vault of 10,000 files.

## 8. Editing and the lock

- **Lock** is a toolbar button. It starts locked every time the view opens (setting: remember last state, default off). Optional auto-relock after N minutes without edits (setting, default 5, 0 means never).
- **When locked:** no drag, no rename, no create, no delete. Right-click only selects and shows "Locked".
- **When unlocked:** an editing bar appears with Rename, New note and Delete. Cards can be dragged onto a folder to move them.
- **Use Obsidian's own APIs so links stay correct:**
  - Move and rename through `app.fileManager.renameFile(file, newPath)`, which updates links in other notes according to the user's link settings.
  - Delete through `app.fileManager.trashFile(file)`, which respects the user's trash setting.
  - Create through `app.vault.create`.
- **Checks before acting:** refuse a move into the same parent, into itself, or into its own descendant. Refuse a name that already exists in the target. Show a clear message (toast), never throw.
- **Undo:** every action pushes an undo entry and shows a toast with an Undo button for about 7 seconds. Undo is best effort: if the file has since changed, show a message instead of overwriting.
- Folders being moved or deleted need an extra confirmation when they contain more than a few files.

## 9. Settings page (horizontal tab strip)

Layout: a header card, a tab strip, then a card per tab containing rows (title, description, control), in Obsidian's own settings style. A small live preview sits above the strip and updates as controls change. On narrow panes the strip scrolls horizontally.

Tabs (six; Lines and Canvas can merge into one "Lines and grid" tab if six feels crowded):

1. **Cards:** width, height, corner radius (0 square to pill), border width, padding, font size, detail level, which info shows (date, size, links, tags, status), status property name.
2. **Lines:** curve style (bezier, step, straight), thickness, dash pattern, flow speed (0 turns animation off), highlight colour.
3. **Canvas:** grid type (dots, lines, none), dot size, spacing, opacity, colour.
4. **Layout:** default layout (vertical or radial), card gap, level spacing, ring radius and ring step, overflow limit (the "+N more" threshold), default state of Expand folders and Expand files.
5. **Editing:** start locked, auto-relock minutes, allow drag to move, confirm threshold for folders, delete behaviour.
6. **Presets:** built-in presets (Compact, Comfortable, Large), save current as a named preset, rename and delete presets, reset a group or everything, export and import settings as JSON (file and clipboard).

Implementation notes:

- Every visual setting writes a CSS variable on the view root (for example `--island-card-radius`, `--island-dot-size`) so changes apply instantly without rebuilding the view. Defaults point at Obsidian theme variables.
- Keep a single typed `Settings` object with defaults, min and max for numbers, and allowed values for enums.
- **Import must validate:** parse JSON safely, ignore unknown keys, clamp numbers to range, reject wrong types, and show a summary of what was applied. Never trust imported data.
- Save through `loadData` and `saveData`, debounced. Include a `version` field and a small migration function.

## 10. Community-plugin checklist

- `manifest.json`: unique id without the word "obsidian", correct `minAppVersion`, `isDesktopOnly: true` for v1, author and funding fields as appropriate.
- `versions.json`, a semantic version, and a GitHub release workflow that attaches `main.js`, `manifest.json` and `styles.css`.
- README with description, screenshots, install steps, settings reference and known limits. A LICENSE file.
- Clean up on unload: detach views, remove event listeners (use `registerEvent`, `registerDomEvent`), destroy Svelte components, cancel timers and animation frames.
- No network calls and no telemetry. Do not use `innerHTML` with vault-derived text. Use `textContent` or Svelte bindings.
- UI strings in sentence case. Use Obsidian CSS variables for colours and the existing icon set (Lucide through `setIcon`) in the Obsidian UI. Mockup icons are Tabler only because of the preview environment.
- Run the official lint rules (`eslint-plugin-obsidianmd` or the current equivalent) before submitting.

## 11. Milestones

1. **Scaffold:** manifest, build, empty view in a main tab, ribbon icon, command, empty settings tab. Hot-reload workflow documented.
2. **Read-only tree:** tree model, visibility rules, vertical layout, cards, curved edges, pan and zoom, dot grid.
3. **Radial layout, focus mode, search, overflow pills, Expand folders and files toggles, breadcrumb, info panel.**
4. **Live updates and metadata:** vault events, link counts, tags, status, recency dot, detailed cards, semantic zoom.
5. **Settings:** tab strip, all controls, CSS variables, live preview, presets, import and export with validation.
6. **Editing:** lock, rename, create, trash, drag to move, undo, auto-relock.
7. **Polish and release:** performance test on a large vault, accessibility (keyboard navigation, focus rings, reduced motion), README with screenshots, release workflow, submission.

## 12. Reference mockup notes

`reference/mockup-island-tree.html` is a self-contained preview of the intended behaviour. It uses its own small layout and animation code, not Svelte Flow, and sample data instead of a vault. Treat it as the behavioural reference for: visibility rules, both layouts, the lock and drag-to-move flow, undo toasts, detailed cards, file type colours, the dot grid, search, focus mode, and the folder and file toggles. Colours in it come from fallback CSS variables defined at the top of the file; in the plugin use Obsidian's theme variables.

## 13. Open questions for the owner

- Final plugin name and id.
- Mobile support after v1 (touch gestures replace hover and right-click).
- Should status and tag chips be configurable per property name beyond `status` and `tags`?
- Should the view remember its pan, zoom and open folders between sessions?
