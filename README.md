# Island tree

An Obsidian plugin that shows your vault's folders and files as an animated, canvas-style dashboard: rounded "island" cards joined by curved, flowing branches, in a vertical or radial layout on a dotted grid.

> **Status: early development (milestone 5 of 7).** The plugin shows a read-only, live-updating tree of your vault in a vertical or radial layout, with search, focus, file details and a full settings page. Editing and the release polish are still to come. See [`PROGRESS.md`](PROGRESS.md).

## Planned features

- Vertical and radial layouts with pan and zoom.
- Updates by itself when files change.
- Cards showing file type, link counts, tags, status, modified date and size, each switchable.
- Optional editing (rename, create, delete, drag to move) behind a lock. The dashboard always starts locked.
- Tabbed settings with presets, import and export.

## Install

Not yet available in the community plugin list. To try a development build, see [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

Once released, install it from **Settings → Community plugins → Browse** and search for "Island tree", or copy `main.js`, `manifest.json` and `styles.css` from a GitHub release into `<your vault>/.obsidian/plugins/island-tree/`.

## Use

- Click the network icon in the ribbon, or run **Open dashboard** from the command palette.
- Run **Open dashboard in sidebar** to open it in the right sidebar.
- Click a folder to open or close it. Click the small badge on a folder to show or hide its files. Click "+N more" to show everything in a long list.
- Drag the background to pan and scroll to zoom.
- Use **Vertical** and **Radial** to change the layout, **Expand folders** and **Expand files** to open everything, and **Reset** to go back to the start.
- The dashboard follows your vault: new, renamed, moved and deleted notes appear without reloading.
- Turn on **Details** for bigger cards with a second row for notes: a dot for how recently it changed (green today, amber within a week, grey older), its age, size, number of links and its status. The status comes from a `status` property in the note. Zoom in to see the row; zoomed far out, cards shrink to a colour and a short name.
- Type in **Search names** to reveal matching files and folders. Clear the box to return to your view.
- Double click a folder to focus on it, or select one and use **Focus selected**. The breadcrumb and **Reset focus** take you back up.
- Double click a file to open it in a new tab, or hold Ctrl (Cmd on a Mac) to open it in a split.

No hotkeys are set by default. Assign your own in **Settings → Hotkeys**.

## Settings

Open **Settings → Island tree**. A live preview at the top shows each change as you make it, and an open dashboard follows too.

- **Cards:** width, height, corner radius, border width, side padding and text size. Which details show (age, size, links, tags, status), whether details start on, and the name of the status property.
- **Lines and grid:** curve style (curved, step or straight), thickness, dash pattern, flow speed (0 stops the animation) and highlight colour. The grid behind the cards: dots, lines or none, with size, spacing, opacity and colour.
- **Layout:** the default layout, gap between cards, spacing between levels, ring distances for the radial layout, how many items a folder lists before "+N more", and whether Expand folders and Expand files start on.
- **Presets:** Compact, Comfortable and Large, your own saved looks, resetting one tab or everything, and exporting or importing settings as JSON (file or clipboard). An import shows a summary and checks every value before anything changes.

An empty colour or a text size of 0 follows your Obsidian theme. Every setting has a reset button.

## Known limits

- Desktop only for version 1.
- No network calls and no telemetry.

## Documentation

- [`SPEC.md`](SPEC.md): agreed design and milestones.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how it is built.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): why it is built that way.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md): setup, commands and testing.

## Licence

[MIT](LICENSE)
