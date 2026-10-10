# Performance

How Island tree behaves on a large vault, what was measured, and the limits that keep it fast. Measured with a made-up vault of 10,000 notes in headless Chrome with Obsidian's own stylesheet (not inside Obsidian itself, see "Not measured").

## Trying it yourself

```
node scripts/synthetic-vault.mjs "F:\Temp\big-vault" balanced
```

Shapes: `balanced` (100 areas, 5 topics each, 20 notes each: the usual shape), `flat` (one folder with 10,000 notes) and `deep` (a chain of 60 folders). The script only writes into a missing or empty folder. Open the folder in Obsidian with **Open folder as vault**. The same shapes drive `src/model/perf.test.ts`.

## Where the time goes

The pure steps are not the problem. For 10,000 notes, on a normal laptop:

| Step | Time |
|---|---|
| Build the tree and index it | about 40 ms |
| Search the whole vault | about 1 ms |
| Lay out 10,000 cards (vertical, radial or mind map) | 5 to 12 ms |

The cost is in drawing and animating cards. Each frame of the glide rebuilds every card, so the number of cards on screen is what matters.

## What was measured before the limits

| Case | Cards | Time to appear | Panning |
|---|---|---|---|
| A folder with 10,000 notes, "+N more" clicked | 10,002 | 5.6 s (frozen) | 8 frames per second, 300 ms frames |
| Searching "note" in the balanced vault | 10,601 | 8.3 s (frozen) | 8 frames per second |
| Everything expanded, default list limit | 248 | 0.06 s | 60 frames per second |
| 1,200 cards in one folder | 1,200 | 0.8 s | 60 frames per second |
| 2,500 cards in one folder | 2,500 | 1.6 s | 43 frames per second |

Drawing only the cards that are on screen (Svelte Flow's `onlyRenderVisibleElements`) was tried at 10,000 cards and did not help, because the per-frame work is in our code, not the page. It was later turned on again for the lower limits below, where it does help.

## The limits

All of them are named constants in `src/model/limits.ts`.

- **A folder lists 40 children at first** (`DEFAULT_LIST_LIMIT`, the **List limit** setting, 2 to 200). "+N more" reveals the next batch of the same size, and a search reveals the batch that holds a match and no other. Batches are by position in the folder's sorted list (folders first, then notes, in natural order), so they are predictable and stable.
- **One folder shows at most 1,000 children** (`FOLDER_CEILING`), however many batches are revealed. A card then says how many are "not shown" and does nothing when clicked; a search finds them, and shows its matches first.
- **The whole dashboard draws at most 1,500 cards** (`MAX_CARDS`), whatever is open. The tree is filled level by level, so the top of the tree always shows and only the deepest levels are cut, with a card ("N not shown") where children were left out. Those cards do not count towards the 1,500.
- **Only the cards on screen are drawn** (Svelte Flow's `onlyRenderVisibleElements`). At 10,000 cards this did not help, because the per-frame work is in our code; at the 1,000-card ceiling it is the difference between 39 and 60 frames per second.
- **Search waits about 0.2 s after you stop typing** (`SEARCH_DELAY_MS`) before it runs, so a broad first letter does not rebuild everything on every keystroke. Clearing the box is instant. The number of matches shows beside the box.

## After the limits

| Case | Cards in the dashboard | Time | Panning |
|---|---|---|---|
| A folder of 10,000 notes, first view | 43 | instant | 60 frames per second |
| The same, "+N more" clicked 25 times (the ceiling) | 1,003 | about 0.1 s per click | 60 frames per second |
| Searching "note" in the balanced vault (10,000 matches) | about 1,950 (43 drawn at a time) | 1.3 s | 60 frames per second |
| Everything expanded in the balanced vault | 248 | 0.06 s | 60 frames per second |

## Not measured

Timings inside Obsidian itself, with its own plugins and a real disk, and on a slower machine. Please try the `balanced` and `flat` vaults there and report anything that feels slow. Obsidian's vault events for a large vault arrive in bursts; the dashboard debounces them (about 150 ms), but that has only been exercised with a small vault.
