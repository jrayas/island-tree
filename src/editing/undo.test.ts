import { describe, expect, it } from "vitest";
import { MAX_UNDO_ENTRIES, UndoStack, type UndoEntry } from "./undo";

const entry = (n: number): UndoEntry => ({
  message: `Action ${n}`,
  undo: { type: "rename", from: `a${n}`, to: `b${n}` },
});

describe("UndoStack", () => {
  it("lets an entry be taken once", () => {
    const stack = new UndoStack();
    const first = entry(1);
    stack.push(first);
    expect(stack.take(first)).toBe(true);
    expect(stack.take(first)).toBe(false);
    expect(stack.size).toBe(0);
  });

  it("refuses an entry it never held", () => {
    expect(new UndoStack().take(entry(1))).toBe(false);
  });

  it("forgets the oldest entries past the limit", () => {
    const stack = new UndoStack();
    const entries = Array.from({ length: MAX_UNDO_ENTRIES + 3 }, (_, i) => entry(i));
    for (const e of entries) stack.push(e);
    expect(stack.size).toBe(MAX_UNDO_ENTRIES);
    expect(stack.take(entries[0])).toBe(false);
    expect(stack.take(entries[entries.length - 1])).toBe(true);
  });

  it("can be cleared", () => {
    const stack = new UndoStack();
    const e = entry(1);
    stack.push(e);
    stack.clear();
    expect(stack.take(e)).toBe(false);
  });
});
