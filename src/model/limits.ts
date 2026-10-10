/**
 * The numbers that keep the dashboard smooth on a big vault, in one place so they are easy to tune.
 *
 * The reasons come from measuring a made-up vault of 10,000 notes (docs/PERFORMANCE.md): the pure
 * steps take milliseconds, but drawing and gliding thousands of cards freezes the dashboard, while
 * about 1,500 stay at 60 frames per second.
 */

/** How many children a folder lists at first, and how many each "+N more" click reveals. The setting's default. */
export const DEFAULT_LIST_LIMIT = 40;

/** The most the List limit setting allows. */
export const MAX_LIST_LIMIT = 200;

/** The most children one folder ever shows, however many batches are revealed. The rest are found by searching. */
export const FOLDER_CEILING = 1000;

/** The most cards the whole dashboard draws at once, whatever is open. Filled level by level. */
export const MAX_CARDS = 1500;

/** How long search waits after the last key press before it runs. */
export const SEARCH_DELAY_MS = 180;
