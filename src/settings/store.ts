/**
 * The live settings, shared by the settings page and every open dashboard.
 *
 * Changing a setting tells all subscribers at once, so open dashboards restyle
 * as you drag a slider. Saving is held back until changes stop, because a slider
 * can fire dozens of changes a second and each save writes a file.
 */
import type { IslandTreeSettings } from "./schema";

export type SettingsListener = (settings: IslandTreeSettings) => void;

export class SettingsStore {
  private current: IslandTreeSettings;
  private readonly listeners = new Set<SettingsListener>();
  private timer: number | null = null;
  private dirty = false;

  constructor(
    initial: IslandTreeSettings,
    private readonly save: (settings: IslandTreeSettings) => Promise<void> | void,
    private readonly delayMs = 300,
    private readonly onSaveError: (error: unknown) => void = () => undefined,
  ) {
    this.current = initial;
  }

  get(): IslandTreeSettings {
    return this.current;
  }

  /** Replaces the settings, tells subscribers now and saves once things go quiet. */
  set(next: IslandTreeSettings): void {
    if (next === this.current) return;
    this.current = next;
    this.dirty = true;
    for (const listener of [...this.listeners]) listener(next);
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.delayMs);
  }

  update(change: (settings: IslandTreeSettings) => IslandTreeSettings): void {
    this.set(change(this.current));
  }

  /** Calls the listener now with the current settings, then on every change. Returns an unsubscribe function. */
  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Saves now if anything changed since the last save. Call when the plugin unloads. */
  async flush(): Promise<void> {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty) return;
    this.dirty = false;
    try {
      await this.save(this.current);
    } catch (error) {
      this.dirty = true;
      this.onSaveError(error);
    }
  }
}
