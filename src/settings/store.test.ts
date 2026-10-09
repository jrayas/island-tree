import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsStore } from "./store";
import { DEFAULT_SETTINGS, findField, withFieldValue, type IslandTreeSettings } from "./schema";

const width = (value: number) => withFieldValue(DEFAULT_SETTINGS, findField("cards.width")!, value);

describe("SettingsStore", () => {
  beforeEach(() => {
    // The store uses window timers so it works in popout windows; point window at the test timers.
    vi.stubGlobal("window", {
      setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms) as unknown as number,
      clearTimeout: (handle: number) => clearTimeout(handle as unknown as ReturnType<typeof setTimeout>),
    });
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts with the settings it was given", () => {
    expect(new SettingsStore(DEFAULT_SETTINGS, vi.fn()).get()).toBe(DEFAULT_SETTINGS);
  });

  it("calls a new subscriber at once, then on every change, and stops after unsubscribe", () => {
    const store = new SettingsStore(DEFAULT_SETTINGS, vi.fn());
    const seen: number[] = [];
    const stop = store.subscribe((s) => seen.push(s.cards.width));
    store.set(width(120));
    store.set(width(130));
    stop();
    store.set(width(140));
    expect(seen).toEqual([116, 120, 130]);
  });

  it("does nothing when given the same object", () => {
    const save = vi.fn();
    const store = new SettingsStore(DEFAULT_SETTINGS, save);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set(DEFAULT_SETTINGS);
    vi.advanceTimersByTime(1000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it("saves once after a burst of changes, with the last value", async () => {
    const save = vi.fn<(settings: IslandTreeSettings) => void>();
    const store = new SettingsStore(DEFAULT_SETTINGS, save, 300);
    for (let w = 100; w <= 140; w += 2) {
      store.set(width(w));
      vi.advanceTimersByTime(20);
    }
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0].cards.width).toBe(140);
  });

  it("update applies a change to the current settings", () => {
    const store = new SettingsStore(DEFAULT_SETTINGS, vi.fn());
    store.update((s) => withFieldValue(s, findField("cards.width")!, 150));
    expect(store.get().cards.width).toBe(150);
  });

  it("flush saves straight away and cancels the wait", async () => {
    const save = vi.fn();
    const store = new SettingsStore(DEFAULT_SETTINGS, save, 300);
    store.set(width(120));
    await store.flush();
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush does nothing when nothing changed", async () => {
    const save = vi.fn();
    await new SettingsStore(DEFAULT_SETTINGS, save).flush();
    expect(save).not.toHaveBeenCalled();
  });

  it("reports a failed save and tries again at the next flush", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(undefined);
    const onError = vi.fn();
    const store = new SettingsStore(DEFAULT_SETTINGS, save, 300, onError);
    store.set(width(120));
    await store.flush();
    expect(onError).toHaveBeenCalledTimes(1);
    await store.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });
});
